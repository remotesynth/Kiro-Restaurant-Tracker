#!/bin/bash

# Script to test the deployment after fixing circular dependency issues
echo "Testing deployment with fixed circular dependency..."

# Check if LocalStack is running
echo "Checking if LocalStack is running..."
curl -s http://localhost:4566 > /dev/null
if [ $? -ne 0 ]; then
    echo "LocalStack doesn't seem to be running. Please start LocalStack first."
    echo "You can start it using: docker run --rm -p 4566:4566 -p 4571:4571 localstack/localstack"
    exit 1
fi

# Navigate to backend directory
cd backend

# Set environment variables for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export STAGE=dev

# Clean up any previous deployment
echo "Cleaning up previous deployment..."
aws --endpoint-url=http://localhost:4566 cloudformation delete-stack --stack-name RestaurantTrackerStack-dev 2>/dev/null
sleep 5

# Bootstrap CDK for LocalStack
echo "Bootstrapping CDK for LocalStack..."
cdklocal bootstrap

# Deploy the CDK stack to LocalStack
echo "Deploying CDK stack to LocalStack..."
cdklocal deploy --all --context stage=dev

# Check deployment status
if [ $? -eq 0 ]; then
    echo "Deployment successful! The circular dependency issue has been resolved."
    
    # Get the outputs from the CloudFormation stack
    echo "Getting outputs from the CloudFormation stack..."
    aws --endpoint-url=http://localhost:4566 cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev --query 'Stacks[0].Outputs' --output table
else
    echo "Deployment failed. Please check the error messages above."
fi