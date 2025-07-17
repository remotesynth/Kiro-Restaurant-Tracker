# CI/CD Setup Guide

This document provides instructions for setting up the CI/CD pipeline for the Restaurant Tracker application.

## GitHub Actions Environments

The CI/CD pipeline uses GitHub Actions environments to manage deployments to different environments. You need to set up the following environments:

1. **development** - For deploying to the development environment
2. **production** - For deploying to the production environment

### Setting Up Environments

1. Go to your GitHub repository
2. Navigate to Settings > Environments
3. Create two environments: `development` and `production`
4. For the production environment, you may want to add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches (restrict to `main`)

## Required Secrets

### Repository Secrets

These secrets are used by both environments:

- `AWS_ACCESS_KEY_ID` - AWS access key with permissions to deploy resources
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)

### Environment Secrets

#### Development Environment

- `DEV_API_URL` - API Gateway URL for the development environment
- `DEV_USER_POOL_ID` - Cognito User Pool ID for the development environment
- `DEV_USER_POOL_CLIENT_ID` - Cognito User Pool Client ID for the development environment
- `DEV_WEBSITE_BUCKET_NAME` - S3 bucket name for the frontend in the development environment
- `DEV_CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID for the development environment
- `DEV_CLOUDFRONT_DOMAIN` - CloudFront domain name for the development environment

#### Production Environment

- `PROD_API_URL` - API Gateway URL for the production environment
- `PROD_USER_POOL_ID` - Cognito User Pool ID for the production environment
- `PROD_USER_POOL_CLIENT_ID` - Cognito User Pool Client ID for the production environment
- `PROD_WEBSITE_BUCKET_NAME` - S3 bucket name for the frontend in the production environment
- `PROD_CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID for the production environment
- `PROD_CLOUDFRONT_DOMAIN` - CloudFront domain name for the production environment

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the repository secrets listed above
4. Navigate to each environment and add the environment-specific secrets

## IAM Permissions

The AWS user associated with the access keys needs the following permissions:

- CloudFormation full access
- S3 full access
- CloudFront full access
- Lambda full access
- API Gateway full access
- Cognito full access
- DynamoDB full access
- IAM role creation and management

For production use, it's recommended to create a more restrictive policy that only grants the necessary permissions.

## Branching Strategy

The CI/CD pipeline is configured to work with the following branching strategy:

- `develop` branch: Deploys to the development environment
- `main` branch: Deploys to the production environment
- Pull requests: Run tests but don't deploy

## Manual Deployments

You can also trigger deployments manually using the GitHub Actions workflow dispatch feature:

1. Go to the Actions tab in your GitHub repository
2. Select either "Backend Deployment" or "Frontend Deployment"
3. Click "Run workflow"
4. Select the branch and environment
5. Click "Run workflow"

## Initial Setup

After the first deployment, you'll need to:

1. Get the outputs from the CloudFormation stack
2. Add these values as secrets in GitHub
3. Update the frontend environment variables

You can get the outputs using the AWS CLI:

```bash
aws cloudformation describe-stacks --stack-name RestaurantTrackerStack-dev --query 'Stacks[0].Outputs' --output table
```

## Troubleshooting

If deployments fail, check the following:

1. AWS credentials are correct and have the necessary permissions
2. All required secrets are set up correctly
3. The CloudFormation stack exists (for frontend deployments that depend on backend resources)
4. The S3 bucket exists and is accessible
5. If you encounter a circular dependency error, refer to the [Circular Dependency Fix](./CIRCULAR-DEPENDENCY-FIX.md) document
