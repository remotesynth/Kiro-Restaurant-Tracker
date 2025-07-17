#!/bin/bash

# Verify backend infrastructure deployment and test API endpoints
echo "Verifying backend infrastructure deployment..."

# Check if LocalStack is running
if ! curl -s http://localhost:4566 > /dev/null; then
    echo "LocalStack is not running. Please start LocalStack first."
    exit 1
fi

# Set environment variables for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export ENDPOINT_URL="http://localhost:4566"

# Get the CloudFormation stack outputs
echo "Getting CloudFormation stack outputs..."
STACK_OUTPUTS=$(aws --endpoint-url=$ENDPOINT_URL cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev --query 'Stacks[0].Outputs' --output json)

# Extract values from stack outputs
USER_POOL_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
API_URL=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue')
WEBSITE_BUCKET_NAME=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="WebsiteBucketName") | .OutputValue')
CLOUDFRONT_DISTRIBUTION_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
CLOUDFRONT_DOMAIN_NAME=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="CloudFrontDomainName") | .OutputValue')

# Print the extracted values
echo "User Pool ID: $USER_POOL_ID"
echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "API URL: $API_URL"
echo "Website Bucket Name: $WEBSITE_BUCKET_NAME"
echo "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
echo "CloudFront Domain Name: $CLOUDFRONT_DOMAIN_NAME"

# Verify DynamoDB table
echo "Verifying DynamoDB table..."
TABLE_NAME="restaurant-tracker-dev"
aws --endpoint-url=$ENDPOINT_URL dynamodb describe-table --table-name $TABLE_NAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ DynamoDB table '$TABLE_NAME' exists."
else
    echo "❌ DynamoDB table '$TABLE_NAME' does not exist."
fi

# Verify Cognito User Pool
echo "Verifying Cognito User Pool..."
if [ -n "$USER_POOL_ID" ]; then
    echo "✅ Cognito User Pool exists with ID: $USER_POOL_ID"
else
    echo "❌ Cognito User Pool does not exist or could not be retrieved."
fi

# Verify API Gateway
echo "Verifying API Gateway..."
if [ -n "$API_URL" ]; then
    echo "✅ API Gateway exists with URL: $API_URL"
else
    echo "❌ API Gateway does not exist or could not be retrieved."
fi

# Verify S3 bucket
echo "Verifying S3 bucket..."
if [ -n "$WEBSITE_BUCKET_NAME" ]; then
    aws --endpoint-url=$ENDPOINT_URL s3api head-bucket --bucket $WEBSITE_BUCKET_NAME > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ S3 bucket '$WEBSITE_BUCKET_NAME' exists."
    else
        echo "❌ S3 bucket '$WEBSITE_BUCKET_NAME' does not exist."
    fi
else
    echo "❌ S3 bucket name could not be retrieved."
fi

# Test API endpoints
echo "Testing API endpoints..."

# Create a test user in Cognito
echo "Creating a test user in Cognito..."
TEST_EMAIL="test@example.com"
aws --endpoint-url=$ENDPOINT_URL cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $TEST_EMAIL \
    --user-attributes Name=email,Value=$TEST_EMAIL Name=email_verified,Value=true \
    --temporary-password "Test@123" > /dev/null 2>&1

# Set the user's password
aws --endpoint-url=$ENDPOINT_URL cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $TEST_EMAIL \
    --password "Test@123" \
    --permanent > /dev/null 2>&1

# Authenticate the user to get a token
echo "Authenticating test user..."
AUTH_RESULT=$(aws --endpoint-url=$ENDPOINT_URL cognito-idp admin-initiate-auth \
    --user-pool-id $USER_POOL_ID \
    --client-id $USER_POOL_CLIENT_ID \
    --auth-flow ADMIN_NO_SRP_AUTH \
    --auth-parameters USERNAME=$TEST_EMAIL,PASSWORD="Test@123" 2>/dev/null)

# Extract the ID token
ID_TOKEN=$(echo $AUTH_RESULT | jq -r '.AuthenticationResult.IdToken')

if [ -z "$ID_TOKEN" ] || [ "$ID_TOKEN" == "null" ]; then
    echo "❌ Failed to authenticate test user."
    exit 1
fi

echo "✅ Successfully authenticated test user."

# Test the /restaurants endpoint (POST)
echo "Testing POST /restaurants endpoint..."
RESTAURANT_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ID_TOKEN" \
    -d '{"name":"Test Restaurant", "location":"Test Location", "cuisineType":"Italian", "description":"Test description"}' \
    ${API_URL}restaurants)

# Extract the restaurant ID
RESTAURANT_ID=$(echo $RESTAURANT_RESPONSE | jq -r '.restaurantId')

if [ -z "$RESTAURANT_ID" ] || [ "$RESTAURANT_ID" == "null" ]; then
    echo "❌ Failed to create test restaurant."
else
    echo "✅ Successfully created test restaurant with ID: $RESTAURANT_ID"

    # Test the /restaurants endpoint (GET)
    echo "Testing GET /restaurants endpoint..."
    RESTAURANTS_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $ID_TOKEN" \
        ${API_URL}restaurants)

    RESTAURANTS_COUNT=$(echo $RESTAURANTS_RESPONSE | jq -r '.restaurants | length')

    if [ "$RESTAURANTS_COUNT" -gt 0 ]; then
        echo "✅ Successfully retrieved restaurants. Count: $RESTAURANTS_COUNT"
    else
        echo "❌ Failed to retrieve restaurants."
    fi

    # Test the /restaurants/{id} endpoint (GET)
    echo "Testing GET /restaurants/{id} endpoint..."
    RESTAURANT_DETAIL_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $ID_TOKEN" \
        ${API_URL}restaurants/$RESTAURANT_ID)

    RESTAURANT_NAME=$(echo $RESTAURANT_DETAIL_RESPONSE | jq -r '.name')

    if [ "$RESTAURANT_NAME" == "Test Restaurant" ]; then
        echo "✅ Successfully retrieved restaurant details."
    else
        echo "❌ Failed to retrieve restaurant details."
    fi

    # Test the /restaurants/{id}/reviews endpoint (POST)
    echo "Testing POST /restaurants/{id}/reviews endpoint..."
    REVIEW_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ID_TOKEN" \
        -d '{"text":"Test review"}' \
        ${API_URL}restaurants/$RESTAURANT_ID/reviews)

    REVIEW_ID=$(echo $REVIEW_RESPONSE | jq -r '.reviewId')

    if [ -z "$REVIEW_ID" ] || [ "$REVIEW_ID" == "null" ]; then
        echo "❌ Failed to create test review."
    else
        echo "✅ Successfully created test review with ID: $REVIEW_ID"
    fi

    # Test the /restaurants/{id}/rating endpoint (PUT)
    echo "Testing PUT /restaurants/{id}/rating endpoint..."
    RATING_RESPONSE=$(curl -s -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ID_TOKEN" \
        -d '{"rating":5}' \
        ${API_URL}restaurants/$RESTAURANT_ID/rating)

    RATING=$(echo $RATING_RESPONSE | jq -r '.rating')

    if [ "$RATING" == "5" ]; then
        echo "✅ Successfully updated restaurant rating."
    else
        echo "❌ Failed to update restaurant rating."
    fi
fi

echo "Verification and testing completed!"