import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RestaurantRepository } from '../../models/restaurant-repository';
import { CuisineType, RestaurantFilters, PaginationParams } from '../../models/types';

/**
 * Lambda function to list restaurants for a user
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
    
    // Parse query string parameters for filters and pagination
    const queryParams = event.queryStringParameters || {};
    
    // Build filters
    const filters: RestaurantFilters = {};
    
    if (queryParams.cuisineType) {
      // Validate cuisine type
      if (Object.values(CuisineType).includes(queryParams.cuisineType as CuisineType)) {
        filters.cuisineType = queryParams.cuisineType as CuisineType;
      } else {
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
    }
    
    if (queryParams.visited !== undefined) {
      filters.visited = queryParams.visited.toLowerCase() === 'true';
    }
    
    if (queryParams.searchTerm) {
      filters.searchTerm = queryParams.searchTerm;
    }
    
    // Build pagination parameters
    const paginationParams: PaginationParams = {};
    
    if (queryParams.limit) {
      const limit = parseInt(queryParams.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        paginationParams.limit = limit;
      }
    }
    
    if (queryParams.nextToken) {
      paginationParams.nextToken = queryParams.nextToken;
    }
    
    // List restaurants
    const repository = new RestaurantRepository();
    const result = await repository.listRestaurants(userId, filters, paginationParams);
    
    // Return the restaurants
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        restaurants: result.restaurants.map(restaurant => ({
          restaurantId: restaurant.restaurantId,
          name: restaurant.name,
          location: restaurant.location,
          cuisineType: restaurant.cuisineType,
          description: restaurant.description,
          visited: restaurant.visited,
          rating: restaurant.rating,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
        })),
        nextToken: result.nextToken,
      }),
    };
  } catch (error) {
    console.error('Error listing restaurants:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error listing restaurants' }),
    };
  }
};