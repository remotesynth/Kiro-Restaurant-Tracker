# Restaurant Tracker

A serverless application deployed to AWS that allows individuals to save and track restaurants they wish to visit or have visited.

## Features

- User authentication with passwordless email login
- Add and manage restaurants with details (name, location, cuisine type, description)
- Mark restaurants as visited/not visited
- Add star ratings (0-5) and review notes to visited restaurants
- Filter and search restaurants by various criteria

## Project Structure

The project is divided into two main parts:

- **Frontend**: React application with TypeScript
- **Backend**: AWS CDK infrastructure with serverless components

### Frontend

The frontend is a React application built with:

- React 19
- TypeScript
- React Router for navigation
- Context API for state management

### Backend

The backend uses AWS serverless technologies:

- AWS Lambda for serverless functions
- Amazon DynamoDB for data storage
- Amazon Cognito for user authentication
- Amazon API Gateway for RESTful APIs
- Amazon S3 and CloudFront for hosting

## Development

### Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally (`npm install -g aws-cdk`)

### Getting Started

1. Clone the repository
2. Set up the backend:

   ```bash
   cd restaurant-tracker/backend
   npm install
   npm run bootstrap  # Only needed once per AWS account/region
   ```

3. Set up the frontend:

   ```bash
   cd restaurant-tracker/frontend
   npm install
   ```

4. Start the frontend development server:
   ```bash
   npm start
   ```

### Deployment

The application can be deployed using the CI/CD pipeline or manually:

#### CI/CD Pipeline

The project includes GitHub Actions workflows for automated deployment:

- Push to `develop` branch: Deploys to development environment
- Push to `main` branch: Deploys to production environment
- Pull requests: Run tests and show infrastructure changes

See [CI/CD Setup Guide](.github/CICD-SETUP.md) for details on setting up the pipeline.

#### Manual Deployment

To deploy manually:

1. Deploy the backend:

   ```bash
   cd restaurant-tracker/backend
   npm run deploy:dev  # For development environment
   # OR
   npm run deploy:prod  # For production environment
   ```

2. Note the outputs from the CloudFormation stack
3. Create a `.env` file in the frontend directory with the backend outputs
4. Build and deploy the frontend:
   ```bash
   cd restaurant-tracker/frontend
   npm run build
   # Deploy the build folder to S3 and invalidate CloudFront
   ```

## Testing

### Backend Tests

```bash
cd restaurant-tracker/backend
npm test
```

### Frontend Tests

```bash
cd restaurant-tracker/frontend
npm test
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Submit a pull request to `develop`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
