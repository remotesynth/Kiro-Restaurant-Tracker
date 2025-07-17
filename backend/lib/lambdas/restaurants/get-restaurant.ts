import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RestaurantRepository } from '../../models/restaurant-repository';

/**
 * Lambda function to get a restaurant by ID
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
    
    // Get the restaurant
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
    
    // Return the restaurant
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
    console.error('Error getting restaurant:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error getting restaurant' }),
    };
  }
};