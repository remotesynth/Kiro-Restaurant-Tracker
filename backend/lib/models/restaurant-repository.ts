import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base-repository';
import { Restaurant, CuisineType, RestaurantFilters, PaginationParams } from './types';

/**
 * Repository for restaurant operations
 */
export class RestaurantRepository extends BaseRepository {
  /**
   * Create a new restaurant
   */
  async createRestaurant(
    userId: string, 
    name: string, 
    location?: string, 
    cuisineType?: CuisineType, 
    description?: string
  ): Promise<Restaurant> {
    const restaurantId = uuidv4();
    const now = this.getTimestamp();
    
    const restaurant: Restaurant = {
      PK: `USER#${userId}`,
      SK: `RESTAURANT#${restaurantId}`,
      restaurantId,
      userId,
      name,
      location,
      cuisineType,
      description,
      visited: false,
      createdAt: now,
      updatedAt: now,
    };
    
    return this.create<Restaurant>(restaurant);
  }
  
  /**
   * Get a restaurant by ID
   */
  async getRestaurantById(userId: string, restaurantId: string): Promise<Restaurant | null> {
    return this.get<Restaurant>({
      PK: `USER#${userId}`,
      SK: `RESTAURANT#${restaurantId}`,
    });
  }
  
  /**
   * Update a restaurant
   */
  async updateRestaurant(
    userId: string, 
    restaurantId: string, 
    updates: Partial<Restaurant>
  ): Promise<Restaurant | null> {
    return this.update<Restaurant>(
      {
        PK: `USER#${userId}`,
        SK: `RESTAURANT#${restaurantId}`,
      },
      updates
    );
  }
  
  /**
   * Delete a restaurant
   */
  async deleteRestaurant(userId: string, restaurantId: string): Promise<void> {
    await this.delete({
      PK: `USER#${userId}`,
      SK: `RESTAURANT#${restaurantId}`,
    });
  }
  
  /**
   * List restaurants for a user with optional filters
   */
  async listRestaurants(
    userId: string, 
    filters?: RestaurantFilters,
    paginationParams?: PaginationParams
  ): Promise<{ restaurants: Restaurant[]; nextToken?: string }> {
    let queryParams: any = {};
    
    // Determine which index to use based on filters
    if (filters?.cuisineType) {
      // Query by cuisine type using GSI1
      queryParams = {
        IndexName: 'GSI1',
        KeyConditionExpression: 'userId = :userId AND cuisineType = :cuisineType',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':cuisineType': filters.cuisineType,
        },
      };
    } else if (filters?.visited !== undefined) {
      // Query by visited status using GSI2
      queryParams = {
        IndexName: 'GSI2',
        KeyConditionExpression: 'userId = :userId AND visited = :visited',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':visited': filters.visited.toString(),
        },
      };
    } else {
      // Query all restaurants for the user
      queryParams = {
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'RESTAURANT#',
        },
      };
    }
    
    // Add search term filter if provided
    if (filters?.searchTerm) {
      queryParams.FilterExpression = 'contains(#name, :searchTerm)';
      queryParams.ExpressionAttributeNames = {
        '#name': 'name',
      };
      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ':searchTerm': filters.searchTerm,
      };
    }
    
    // Add pagination parameters if provided
    if (paginationParams?.limit) {
      queryParams.Limit = paginationParams.limit;
    }
    
    if (paginationParams?.nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(paginationParams.nextToken, 'base64').toString('utf-8')
      );
    }
    
    const result = await this.query<Restaurant>(queryParams);
    
    return {
      restaurants: result.items,
      nextToken: result.nextToken,
    };
  }
  
  /**
   * Update a restaurant's rating
   */
  async updateRating(
    userId: string, 
    restaurantId: string, 
    rating: number
  ): Promise<Restaurant | null> {
    // Validate rating
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    
    return this.updateRestaurant(userId, restaurantId, { 
      visited: true,
      rating,
    });
  }
}