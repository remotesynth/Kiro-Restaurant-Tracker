#!/bin/bash

# Deploy frontend application to S3 and CloudFront
echo "Deploying frontend application..."

# Check if environment variables are set
if [ -z "$WEBSITE_BUCKET_NAME" ] || [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ] || [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$USER_POOL_CLIENT_ID" ]; then
    echo "Environment variables are not set. Please set the following variables:"
    echo "WEBSITE_BUCKET_NAME, CLOUDFRONT_DISTRIBUTION_ID, API_URL, USER_POOL_ID, USER_POOL_CLIENT_ID"
    
    # Check if we're running in LocalStack mode
    if [ "$USE_LOCALSTACK" == "true" ]; then
        echo "Using LocalStack mode. Getting values from CloudFormation stack..."
        
        # Set environment variables for LocalStack
        export AWS_ACCESS_KEY_ID=test
        export AWS_SECRET_ACCESS_KEY=test
        export AWS_DEFAULT_REGION=us-east-1
        export ENDPOINT_URL="http://localhost:4566"
        
        # Get the CloudFormation stack outputs
        STACK_OUTPUTS=$(aws --endpoint-url=$ENDPOINT_URL cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev --query 'Stacks[0].Outputs' --output json)
        
        # Extract values from stack outputs
        export USER_POOL_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
        export USER_POOL_CLIENT_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
        export API_URL=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue')
        export WEBSITE_BUCKET_NAME=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="WebsiteBucketName") | .OutputValue')
        export CLOUDFRONT_DISTRIBUTION_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
        export CLOUDFRONT_DOMAIN_NAME=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="CloudFrontDomainName") | .OutputValue')
        
        echo "Retrieved values from CloudFormation stack:"
        echo "User Pool ID: $USER_POOL_ID"
        echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
        echo "API URL: $API_URL"
        echo "Website Bucket Name: $WEBSITE_BUCKET_NAME"
        echo "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
        echo "CloudFront Domain Name: $CLOUDFRONT_DOMAIN_NAME"
    else
        exit 1
    fi
fi

# Create .env file for React application
echo "Creating .env file for React application..."
cat > .env << EOL
REACT_APP_API_URL=$API_URL
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
EOL

# Build the React application
echo "Building React application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed. Exiting."
    exit 1
fi

echo "Build successful."

# Deploy to S3
echo "Deploying to S3 bucket: $WEBSITE_BUCKET_NAME"

if [ "$USE_LOCALSTACK" == "true" ]; then
    # Using LocalStack
    aws --endpoint-url=http://localhost:4566 s3 sync build/ s3://$WEBSITE_BUCKET_NAME/ --delete
else
    # Using AWS
    aws s3 sync build/ s3://$WEBSITE_BUCKET_NAME/ --delete
fi

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache: $CLOUDFRONT_DISTRIBUTION_ID"

if [ "$USE_LOCALSTACK" == "true" ]; then
    # LocalStack doesn't fully support CloudFront invalidations, so we'll just log it
    echo "Note: CloudFront invalidation is not fully supported in LocalStack"
else
    # Using AWS
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
fi

echo "Frontend deployment completed!"
echo "Website URL: https://$CLOUDFRONT_DOMAIN_NAME"