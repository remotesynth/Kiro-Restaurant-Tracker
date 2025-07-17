# Restaurant Tracker Backend

This is the backend infrastructure for the Restaurant Tracker application, built using AWS CDK with TypeScript.

## Architecture

The backend uses the following AWS services:

- **Amazon Cognito**: For user authentication with passwordless email login
- **Amazon DynamoDB**: For storing restaurant and review data
- **AWS Lambda**: For serverless API functions
- **Amazon API Gateway**: For RESTful API endpoints
- **Amazon S3**: For hosting the frontend application
- **Amazon CloudFront**: For content delivery and HTTPS

## Prerequisites

- Node.js (v14 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally (`npm install -g aws-cdk`)

## Getting Started

1. Install dependencies:

   ```
   npm install
   ```

2. Bootstrap your AWS environment (if not already done):

   ```
   npm run bootstrap
   ```

3. Deploy the stack to your AWS account:
   ```
   npm run deploy:dev
   ```

## Environment Configuration

Copy the `.env.example` file to `.env` and fill in the values after deployment:

```
cp .env.example .env
```

After deployment, the CDK will output the necessary values to fill in your `.env` file.

## Deployment Environments

The application supports multiple deployment environments:

- **Development**:

  ```
  npm run deploy:dev
  ```

- **Production**:
  ```
  npm run deploy:prod
  ```

## Useful Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run test` - Run tests
- `npm run cdk -- diff` - Compare deployed stack with current state
- `npm run synth` - Emit the synthesized CloudFormation template
- `npm run destroy:dev` - Destroy the development stack

## Security Considerations

The current configuration includes settings that are suitable for development but should be modified for production:

- `removalPolicy: cdk.RemovalPolicy.DESTROY` - In production, consider using `RETAIN` for critical resources
- `autoDeleteObjects: true` - In production, consider setting this to `false` for S3 buckets

## Adding Lambda Functions

To add new Lambda functions to the stack, create them in the `lib/lambdas` directory and reference them in the `backend-stack.ts` file.
