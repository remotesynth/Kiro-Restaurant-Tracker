#!/bin/bash

# End-to-end testing script for Restaurant Tracker application
echo "Starting end-to-end testing..."

# Check if environment variables are set
if [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$USER_POOL_CLIENT_ID" ]; then
    echo "Environment variables are not set. Please set the following variables:"
    echo "API_URL, USER_POOL_ID, USER_POOL_CLIENT_ID"
    
    # Check if we're running in LocalStack mode
    if [ "$USE_LOCALSTACK" == "true" ]; then
        echo "Using LocalStack mode. Getting values from CloudFormation stack..."
        
        # Set environment variables for LocalStack
        export AWS_ACCESS_KEY_ID=test
        export AWS_SECRET_ACCESS_KEY=test
        export AWS_DEFAULT_REGION=us-east-1
        export ENDPOINT_URL="http://localhost:4566"
        
        # Check if the stack exists
        STACK_EXISTS=$(aws --endpoint-url=$ENDPOINT_URL cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev 2>/dev/null)
        if [ $? -ne 0 ]; then
            echo "Stack RestaurantTrackerStack-dev does not exist. Please deploy the stack first."
            echo "You can use the test-deploy.sh script to deploy the stack."
            exit 1
        fi
        
        # Get the CloudFormation stack outputs
        STACK_OUTPUTS=$(aws --endpoint-url=$ENDPOINT_URL cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev --query 'Stacks[0].Outputs' --output json)
        
        # Extract values from stack outputs
        export USER_POOL_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
        export USER_POOL_CLIENT_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
        export API_URL=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue')
        
        echo "Retrieved values from CloudFormation stack:"
        echo "User Pool ID: $USER_POOL_ID"
        echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
        echo "API URL: $API_URL"
        
        # Validate that we got all the required values
        if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" == "null" ] || 
           [ -z "$USER_POOL_CLIENT_ID" ] || [ "$USER_POOL_CLIENT_ID" == "null" ] || 
           [ -z "$API_URL" ] || [ "$API_URL" == "null" ]; then
            echo "Failed to retrieve all required values from the CloudFormation stack."
            exit 1
        fi
    else
        exit 1
    fi
fi

# Test variables
TEST_EMAIL="e2e-test@example.com"
TEST_PASSWORD="Test@123"
RESTAURANT_NAME="E2E Test Restaurant"
RESTAURANT_LOCATION="E2E Test Location"
CUISINE_TYPE="Italian"
RESTAURANT_DESCRIPTION="This is a test restaurant created during E2E testing"
REVIEW_TEXT="This is a test review added during E2E testing"
RATING=4

echo "=== 1. Testing Authentication Flow ==="

# Create a test user in Cognito
echo "Creating a test user in Cognito..."
if [ "$USE_LOCALSTACK" == "true" ]; then
    aws --endpoint-url=$ENDPOINT_URL cognito-idp admin-create-user \
        --user-pool-id $USER_POOL_ID \
        --username $TEST_EMAIL \
        --user-attributes Name=email,Value=$TEST_EMAIL Name=email_verified,Value=true \
        --temporary-password $TEST_PASSWORD > /dev/null 2>&1

    # Set the user's password
    aws --endpoint-url=$ENDPOINT_URL cognito-idp admin-set-user-password \
        --user-pool-id $USER_POOL_ID \
        --username $TEST_EMAIL \
        --password $TEST_PASSWORD \
        --permanent > /dev/null 2>&1
else
    aws cognito-idp admin-create-user \
        --user-pool-id $USER_POOL_ID \
        --username $TEST_EMAIL \
        --user-attributes Name=email,Value=$TEST_EMAIL Name=email_verified,Value=true \
        --temporary-password $TEST_PASSWORD > /dev/null 2>&1

    # Set the user's password
    aws cognito-idp admin-set-user-password \
        --user-pool-id $USER_POOL_ID \
        --username $TEST_EMAIL \
        --password $TEST_PASSWORD \
        --permanent > /dev/null 2>&1
fi

# Authenticate the user to get a token
echo "Authenticating test user..."
if [ "$USE_LOCALSTACK" == "true" ]; then
    AUTH_RESULT=$(aws --endpoint-url=$ENDPOINT_URL cognito-idp admin-initiate-auth \
        --user-pool-id $USER_POOL_ID \
        --client-id $USER_POOL_CLIENT_ID \
        --auth-flow ADMIN_NO_SRP_AUTH \
        --auth-parameters USERNAME=$TEST_EMAIL,PASSWORD=$TEST_PASSWORD 2>/dev/null)
else
    AUTH_RESULT=$(aws cognito-idp admin-initiate-auth \
        --user-pool-id $USER_POOL_ID \
        --client-id $USER_POOL_CLIENT_ID \
        --auth-flow ADMIN_NO_SRP_AUTH \
        --auth-parameters USERNAME=$TEST_EMAIL,PASSWORD=$TEST_PASSWORD 2>/dev/null)
fi

# Extract the ID token
ID_TOKEN=$(echo $AUTH_RESULT | jq -r '.AuthenticationResult.IdToken')

if [ -z "$ID_TOKEN" ] || [ "$ID_TOKEN" == "null" ]; then
    echo "❌ Authentication test failed: Could not authenticate user."
    exit 1
fi

echo "✅ Authentication test passed: Successfully authenticated user."

echo "=== 2. Testing Restaurant Management ==="

# Create a restaurant
echo "Creating a test restaurant..."
RESTAURANT_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ID_TOKEN" \
    -d "{\"name\":\"$RESTAURANT_NAME\", \"location\":\"$RESTAURANT_LOCATION\", \"cuisineType\":\"$CUISINE_TYPE\", \"description\":\"$RESTAURANT_DESCRIPTION\"}" \
    ${API_URL}restaurants)

# Extract the restaurant ID
RESTAURANT_ID=$(echo $RESTAURANT_RESPONSE | jq -r '.restaurantId')

if [ -z "$RESTAURANT_ID" ] || [ "$RESTAURANT_ID" == "null" ]; then
    echo "❌ Restaurant creation test failed: Could not create restaurant."
    exit 1
fi

echo "✅ Restaurant creation test passed: Created restaurant with ID $RESTAURANT_ID"

# Get the restaurant
echo "Getting the test restaurant..."
RESTAURANT_DETAIL_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $ID_TOKEN" \
    ${API_URL}restaurants/$RESTAURANT_ID)

RESTAURANT_NAME_RESPONSE=$(echo $RESTAURANT_DETAIL_RESPONSE | jq -r '.name')

if [ "$RESTAURANT_NAME_RESPONSE" != "$RESTAURANT_NAME" ]; then
    echo "❌ Restaurant retrieval test failed: Restaurant name does not match."
    exit 1
fi

echo "✅ Restaurant retrieval test passed: Successfully retrieved restaurant details."

# Update the restaurant
echo "Updating the test restaurant..."
UPDATED_DESCRIPTION="Updated description during E2E testing"
UPDATE_RESPONSE=$(curl -s -X PUT \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ID_TOKEN" \
    -d "{\"description\":\"$UPDATED_DESCRIPTION\", \"visited\":true}" \
    ${API_URL}restaurants/$RESTAURANT_ID)

UPDATED_DESCRIPTION_RESPONSE=$(echo $UPDATE_RESPONSE | jq -r '.description')
VISITED_STATUS=$(echo $UPDATE_RESPONSE | jq -r '.visited')

if [ "$UPDATED_DESCRIPTION_RESPONSE" != "$UPDATED_DESCRIPTION" ] || [ "$VISITED_STATUS" != "true" ]; then
    echo "❌ Restaurant update test failed: Restaurant update did not apply correctly."
    exit 1
fi

echo "✅ Restaurant update test passed: Successfully updated restaurant details."

echo "=== 3. Testing Review System ==="

# Add a review note
echo "Adding a review note..."
REVIEW_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ID_TOKEN" \
    -d "{\"text\":\"$REVIEW_TEXT\"}" \
    ${API_URL}restaurants/$RESTAURANT_ID/reviews)

REVIEW_ID=$(echo $REVIEW_RESPONSE | jq -r '.reviewId')

if [ -z "$REVIEW_ID" ] || [ "$REVIEW_ID" == "null" ]; then
    echo "❌ Review creation test failed: Could not create review."
    exit 1
fi

echo "✅ Review creation test passed: Created review with ID $REVIEW_ID"

# Update the rating
echo "Updating the restaurant rating..."
RATING_RESPONSE=$(curl -s -X PUT \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ID_TOKEN" \
    -d "{\"rating\":$RATING}" \
    ${API_URL}restaurants/$RESTAURANT_ID/rating)

RATING_RESPONSE_VALUE=$(echo $RATING_RESPONSE | jq -r '.rating')

if [ "$RATING_RESPONSE_VALUE" != "$RATING" ]; then
    echo "❌ Rating update test failed: Rating was not updated correctly."
    exit 1
fi

echo "✅ Rating update test passed: Successfully updated restaurant rating."

# Get the reviews
echo "Getting the reviews..."
REVIEWS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $ID_TOKEN" \
    ${API_URL}restaurants/$RESTAURANT_ID/reviews)

REVIEWS_COUNT=$(echo $REVIEWS_RESPONSE | jq -r '.reviews | length')
REVIEW_TEXT_RESPONSE=$(echo $REVIEWS_RESPONSE | jq -r '.reviews[0].text')

if [ "$REVIEWS_COUNT" -lt 1 ] || [ "$REVIEW_TEXT_RESPONSE" != "$REVIEW_TEXT" ]; then
    echo "❌ Review retrieval test failed: Could not retrieve reviews correctly."
    exit 1
fi

echo "✅ Review retrieval test passed: Successfully retrieved reviews."

echo "=== End-to-End Testing Summary ==="
echo "✅ Authentication Flow: PASSED"
echo "✅ Restaurant Management: PASSED"
echo "✅ Review System: PASSED"
echo "All tests passed successfully!"