import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RestaurantRepository } from '../../models/restaurant-repository';
import { CreateRestaurantRequest, CuisineType } from '../../models/types';

/**
 * Lambda function to create a new restaurant
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
    
    const request: CreateRestaurantRequest = JSON.parse(event.body);
    
    // Validate the request
    if (!request.name) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Restaurant name is required' }),
      };
    }
    
    // Validate cuisine type if provided
    if (request.cuisineType && !Object.values(CuisineType).includes(request.cuisineType)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Invalid cuisine type' }),
      };
    }
    
    // Create the restaurant
    const repository = new RestaurantRepository();
    const restaurant = await repository.createRestaurant(
      userId,
      request.name,
      request.location,
      request.cuisineType,
      request.description
    );
    
    // Return the created restaurant
    return {
      statusCode: 201,
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
    console.error('Error creating restaurant:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error creating restaurant' }),
    };
  }
};