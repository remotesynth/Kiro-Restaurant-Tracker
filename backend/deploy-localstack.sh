#!/bin/bash

# Deploy backend infrastructure to LocalStack
echo "Deploying backend infrastructure to LocalStack..."

# Check if LocalStack is running
if ! command -v localstack &> /dev/null; then
    echo "LocalStack is not installed. Please install it first."
    echo "You can install it using: pip install localstack"
    exit 1
fi

# Check if cdklocal is installed
if ! command -v cdklocal &> /dev/null; then
    echo "cdklocal is not installed. Installing it now..."
    npm install -g aws-cdk-local aws-cdk
fi

# Set environment variables for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export STAGE=dev

# Bootstrap CDK for LocalStack
echo "Bootstrapping CDK for LocalStack..."
cdklocal bootstrap

# Build Lambda functions
echo "Building Lambda functions..."
chmod +x ./build-lambdas.sh
./build-lambdas.sh

# Deploy the CDK stack to LocalStack
echo "Deploying CDK stack to LocalStack..."
cdklocal deploy --all --context stage=dev

# Check if deployment was successful
if [ $? -ne 0 ]; then
    echo "Deployment failed. If you encountered a circular dependency error, please refer to the CIRCULAR-DEPENDENCY-FIX.md document in the .github directory."
    exit 1
fi

# Get the outputs from the CloudFormation stack
echo "Getting outputs from the CloudFormation stack..."
aws --endpoint-url=http://localhost:4566 cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev --query 'Stacks[0].Outputs' --output table

echo "Backend infrastructure deployment to LocalStack completed!"