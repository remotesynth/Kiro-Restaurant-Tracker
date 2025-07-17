import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RestaurantRepository } from '../../models/restaurant-repository';
import { UpdateRatingRequest } from '../../models/types';

/**
 * Lambda function to update a restaurant's rating
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
    
    const request: UpdateRatingRequest = JSON.parse(event.body);
    
    // Validate the request
    if (request.rating === undefined || request.rating === null) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Rating is required' }),
      };
    }
    
    if (request.rating < 0 || request.rating > 5) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Rating must be between 0 and 5' }),
      };
    }
    
    // Update the restaurant's rating
    const repository = new RestaurantRepository();
    const restaurant = await repository.updateRating(userId, restaurantId, request.rating);
    
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
    
    // Return the updated restaurant
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        restaurantId: restaurant.restaurantId,
        name: restaurant.name,
        location: restaurant.location,
        cuisineType: restaurant.cuisineType,
        description: restaurant.description,
        visited: restaurant.visited,
        rating: restaurant.rating,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
      }),
    };
  } catch (error) {
    console.error('Error updating rating:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error updating rating' }),
    };
  }
};