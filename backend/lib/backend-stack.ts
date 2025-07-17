import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment variables
    const stage = this.node.tryGetContext('stage') || 'dev';
    const appName = 'restaurant-tracker';

    // Step 1: Create the DynamoDB table
    const table = new dynamodb.Table(this, 'RestaurantTable', {
      tableName: `${appName}-${stage}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
      timeToLiveAttribute: 'ttl', // For session data or temporary items
      pointInTimeRecovery: true, // Enable point-in-time recovery for data protection
    });

    // Add GSIs for access patterns
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'cuisineType', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'visited', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    
    table.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'restaurantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Step 2: Create separate roles for different Lambda function types
    
    // Role for auth Lambda functions (without Cognito permissions initially)
    const authLambdaRole = new iam.Role(this, 'AuthLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        'SESAccess': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['ses:SendEmail', 'ses:SendRawEmail'],
              resources: ['*'],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
      },
    });
    
    // Role for data access Lambda functions
    const dataLambdaRole = new iam.Role(this, 'DataLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        'DynamoDBAccess': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:ConditionCheckItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
                'dynamodb:GetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:PutItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:UpdateItem'
              ],
              resources: [
                table.tableArn,
                `${table.tableArn}/index/*`
              ],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
      },
    });

    // Step 3: Create Lambda functions for Cognito triggers
    const defineAuthChallengeFn = new NodejsFunction(this, 'DefineAuthChallenge', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'define-auth-challenge.handler',
      entry: 'lib/lambdas/auth/define-auth-challenge.ts',
      environment: {
        STAGE: stage,
      },
      role: authLambdaRole,
    });

    const createAuthChallengeFn = new NodejsFunction(this, 'CreateAuthChallenge', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create-auth-challenge.handler',
      entry: 'lib/lambdas/auth/create-auth-challenge.ts',
      environment: {
        STAGE: stage,
      },
      role: authLambdaRole,
      timeout: cdk.Duration.seconds(30),
    });

    const verifyAuthChallengeFn = new NodejsFunction(this, 'VerifyAuthChallenge', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'verify-auth-challenge.handler',
      entry: 'lib/lambdas/auth/verify-auth-challenge.ts',
      environment: {
        STAGE: stage,
      },
      role: authLambdaRole,
    });

    // Step 4: Create the Cognito User Pool
    // IMPORTANT: Create it without Lambda triggers first
    const userPool = new cognito.UserPool(this, 'RestaurantUserPool', {
      userPoolName: `${appName}-user-pool-${stage}`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        isPasswordless: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });

    // Step 5: Create the User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'RestaurantUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      preventUserExistenceErrors: true,
    });

    // Step 6: Add Lambda triggers to the User Pool using CloudFormation escape hatches
    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;
    cfnUserPool.lambdaConfig = {
      defineAuthChallenge: defineAuthChallengeFn.functionArn,
      createAuthChallenge: createAuthChallengeFn.functionArn,
      verifyAuthChallengeResponse: verifyAuthChallengeFn.functionArn,
    };
    
    // Step 7: Add permissions for Cognito to invoke the Lambda functions
    defineAuthChallengeFn.addPermission('CognitoInvoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: userPool.userPoolArn,
    });
    
    createAuthChallengeFn.addPermission('CognitoInvoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: userPool.userPoolArn,
    });
    
    verifyAuthChallengeFn.addPermission('CognitoInvoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: userPool.userPoolArn,
    });

    // Step 8: Create API Gateway
    const api = new apigateway.RestApi(this, 'RestaurantApi', {
      restApiName: `${appName}-api-${stage}`,
      description: 'Restaurant Tracker API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true,
      },
    });

    // Step 9: Create Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'RestaurantAuthorizer', {
      cognitoUserPools: [userPool],
    });
    
    // Step 10: Create Authentication Lambda function with a separate role
    // This function needs access to Cognito
    const initiateAuthRole = new iam.Role(this, 'InitiateAuthRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    
    const initiateAuthFn = new NodejsFunction(this, 'InitiateAuth', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'initiate-auth.handler',
      entry: 'lib/lambdas/auth/initiate-auth.ts',
      environment: {
        STAGE: stage,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      role: initiateAuthRole,
    });
    
    // Now that both the user pool and Lambda function are defined,
    // we can safely add the Cognito permissions to the role
    initiateAuthRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:InitiateAuth',
        ],
        resources: [userPool.userPoolArn],
        effect: iam.Effect.ALLOW,
      })
    );
    
    // Step 11: Create API Gateway endpoints for authentication
    const authResource = api.root.addResource('auth');
    const loginResource = authResource.addResource('login');
    
    // POST /auth/login - Initiate authentication
    loginResource.addMethod('POST', new apigateway.LambdaIntegration(initiateAuthFn));
    
    // Step 12: Create Restaurant Lambda functions
    const createRestaurantFn = new lambda.Function(this, 'CreateRestaurant', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'create-restaurant.handler',
      code: lambda.Code.fromAsset('dist/lambdas/restaurants'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    const getRestaurantFn = new lambda.Function(this, 'GetRestaurant', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-restaurant.handler',
      code: lambda.Code.fromAsset('dist/lambdas/restaurants'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    const listRestaurantsFn = new lambda.Function(this, 'ListRestaurants', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'list-restaurants.handler',
      code: lambda.Code.fromAsset('dist/lambdas/restaurants'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    const updateRestaurantFn = new lambda.Function(this, 'UpdateRestaurant', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'update-restaurant.handler',
      code: lambda.Code.fromAsset('dist/lambdas/restaurants'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    // Step 13: Create API Gateway endpoints for restaurants
    const restaurantsResource = api.root.addResource('restaurants');
    
    // GET /restaurants - List restaurants
    restaurantsResource.addMethod('GET', new apigateway.LambdaIntegration(listRestaurantsFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // POST /restaurants - Create restaurant
    restaurantsResource.addMethod('POST', new apigateway.LambdaIntegration(createRestaurantFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // Restaurant resource with ID parameter
    const restaurantResource = restaurantsResource.addResource('{restaurantId}');
    
    // GET /restaurants/{restaurantId} - Get restaurant
    restaurantResource.addMethod('GET', new apigateway.LambdaIntegration(getRestaurantFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // PUT /restaurants/{restaurantId} - Update restaurant
    restaurantResource.addMethod('PUT', new apigateway.LambdaIntegration(updateRestaurantFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // Step 14: Create Review Lambda functions
    const addReviewNoteFn = new lambda.Function(this, 'AddReviewNote', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'add-review-note.handler',
      code: lambda.Code.fromAsset('dist/lambdas/reviews'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    const updateRatingFn = new lambda.Function(this, 'UpdateRating', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'update-rating.handler',
      code: lambda.Code.fromAsset('dist/lambdas/reviews'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    const getReviewsFn = new lambda.Function(this, 'GetReviews', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'get-reviews.handler',
      code: lambda.Code.fromAsset('dist/lambdas/reviews'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      role: dataLambdaRole,
    });
    
    // Step 15: Create API Gateway endpoints for reviews
    const reviewsResource = restaurantResource.addResource('reviews');
    
    // GET /restaurants/{restaurantId}/reviews - Get reviews for a restaurant
    reviewsResource.addMethod('GET', new apigateway.LambdaIntegration(getReviewsFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // POST /restaurants/{restaurantId}/reviews - Add a review note
    reviewsResource.addMethod('POST', new apigateway.LambdaIntegration(addReviewNoteFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    // PUT /restaurants/{restaurantId}/rating - Update a restaurant's rating
    const ratingResource = restaurantResource.addResource('rating');
    ratingResource.addMethod('PUT', new apigateway.LambdaIntegration(updateRatingFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Step 16: Create S3 bucket for frontend hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${appName}-website-${stage}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
      autoDeleteObjects: true, // NOT recommended for production
    });

    // Step 17: Create CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'WebsiteOAI');

    // Step 18: Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Step 19: Create CloudFormation outputs
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'The ID of the Cognito User Pool',
      exportName: `${appName}-${stage}-user-pool-id`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'The ID of the Cognito User Pool Client',
      exportName: `${appName}-${stage}-user-pool-client-id`,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
      exportName: `${appName}-${stage}-api-url`,
    });

    new CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'The name of the S3 bucket hosting the website',
      exportName: `${appName}-${stage}-website-bucket-name`,
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'The ID of the CloudFront distribution',
      exportName: `${appName}-${stage}-distribution-id`,
    });

    new CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.distributionDomainName,
      description: 'The domain name of the CloudFront distribution',
      exportName: `${appName}-${stage}-domain-name`,
    });
  }
}