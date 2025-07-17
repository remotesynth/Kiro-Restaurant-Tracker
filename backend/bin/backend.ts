#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

// Get deployment stage from context or default to 'dev'
const stage = app.node.tryGetContext('stage') || 'dev';

// Create the stack with environment configuration
new BackendStack(app, `RestaurantTrackerStack-${stage}`, {
  // Use the AWS account and region from the current CLI configuration
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  },
  
  // Add description to the CloudFormation stack
  description: `Restaurant Tracker application infrastructure - ${stage} environment`,
  
  // Add tags to all resources in the stack
  tags: {
    Environment: stage,
    Project: 'RestaurantTracker',
    ManagedBy: 'CDK'
  }
});