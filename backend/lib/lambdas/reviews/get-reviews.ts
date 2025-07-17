import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RestaurantRepository } from '../../models/restaurant-repository';
import * as AWS from 'aws-sdk';
import { ReviewNote } from '../../models/types';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

/**
 * Lambda function to get all review notes for a restaurant
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get the user ID from the Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub;
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }
    
    // Get the restaurant ID from the path parameters
    const restaurantId = event.pathParameters?.restaurantId;
    
    if (!restaurantId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Restaurant ID is required' }),
      };
    }
    
    // First, check if the restaurant exists and belongs to the user
    const repository = new RestaurantRepository();
    const restaurant = await repository.getRestaurantById(userId, restaurantId);
    
    if (!restaurant) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Restaurant not found' }),
      };
    }
    
    // Get all review notes for the restaurant
    const result = await dynamoDb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}`,
        ':sk': 'REVIEW#',
      },
      ScanIndexForward: false, // Sort by most recent first
    }).promise();
    
    const reviews = (result.Items || []) as ReviewNote[];
    
    // Return the reviews
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        reviews: reviews.map(review => ({
          reviewId: review.reviewId,
          text: review.text,
          createdAt: review.createdAt,
        })),
      }),
    };
  } catch (error) {
    console.error('Error getting reviews:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error getting reviews' }),
    };
  }
};