import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RestaurantRepository } from '../../models/restaurant-repository';
import { CreateReviewRequest } from '../../models/types';
import { v4 as uuidv4 } from 'uuid';
import * as AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

/**
 * Lambda function to add a review note to a restaurant
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
    
    // Parse the request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }
    
    const request: CreateReviewRequest = JSON.parse(event.body);
    
    // Validate the request
    if (!request.text) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Review text is required' }),
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
    
    // Mark the restaurant as visited if it's not already
    if (!restaurant.visited) {
      await repository.updateRestaurant(userId, restaurantId, { visited: true });
    }
    
    // Create the review note
    const reviewId = uuidv4();
    const now = new Date().toISOString();
    
    const reviewNote = {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `REVIEW#${reviewId}`,
      reviewId,
      restaurantId,
      userId,
      text: request.text,
      createdAt: now,
      updatedAt: now,
    };
    
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: reviewNote,
    }).promise();
    
    // Return the created review note
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        reviewId,
        text: request.text,
        createdAt: now,
      }),
    };
  } catch (error) {
    console.error('Error adding review note:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error adding review note' }),
    };
  }
};