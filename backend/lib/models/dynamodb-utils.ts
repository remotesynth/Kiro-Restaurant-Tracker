import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  Restaurant, 
  ReviewNote, 
  CuisineType,
  RestaurantFilters,
  PaginationParams
} from './types';

// Initialize the DynamoDB Document Client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Get the table name from environment variables
const TABLE_NAME = process.env.TABLE_NAME || '';

/**
 * Utility functions for DynamoDB operations
 */
export class DynamoDBUtils {
  /**
   * Create a new user
   */
  static async createUser(email: string): Promise<User> {
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const user: User = {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      userId,
      email,
      createdAt: now,
      updatedAt: now,
    };
    
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: user,
    }).promise();
    
    return user;
  }
  
  /**
   * Get a user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    }).promise();
    
    return (result.Item as User) || null;
  }
  
  /**
   * Get a user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await dynamoDb.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    }).promise();
    
    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as User;
    }
    
    return null;
  }
  
  /**
   * Create a new restaurant
   */
  static async createRestaurant(
    userId: string, 
    name: string, 
    location?: string, 
    cuisineType?: CuisineType, 
    description?: string
  ): Promise<Restaurant> {
    const restaurantId = uuidv4();
    const now = new Date().toISOString();
    
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
    
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: restaurant,
    }).promise();
    
    return restaurant;
  }
  
  /**
   * Get a restaurant by ID
   */
  static async getRestaurantById(userId: string, restaurantId: string): Promise<Restaurant | null> {
    const result = await dynamoDb.get({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `RESTAURANT#${restaurantId}`,
      },
    }).promise();
    
    return (result.Item as Restaurant) || null;
  }
  
  /**
   * Update a restaurant
   */
  static async updateRestaurant(
    userId: string, 
    restaurantId: string, 
    updates: Partial<Restaurant>
  ): Promise<Restaurant | null> {
    // First, get the current restaurant
    const currentRestaurant = await this.getRestaurantById(userId, restaurantId);
    
    if (!currentRestaurant) {
      return null;
    }
    
    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Add other updates
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'PK' && key !== 'SK' && key !== 'restaurantId' && key !== 'userId' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
    
    // Update the restaurant
    const result = await dynamoDb.update({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `RESTAURANT#${restaurantId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();
    
    return result.Attributes as Restaurant;
  }
  
  /**
   * Delete a restaurant
   */
  static async deleteRestaurant(userId: string, restaurantId: string): Promise<void> {
    await dynamoDb.delete({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `RESTAURANT#${restaurantId}`,
      },
    }).promise();
  }
  
  /**
   * List restaurants for a user with optional filters
   */
  static async listRestaurants(
    userId: string, 
    filters?: RestaurantFilters,
    paginationParams?: PaginationParams
  ): Promise<{ restaurants: Restaurant[]; nextToken?: string }> {
    let queryParams: DocumentClient.QueryInput;
    
    // Determine which index to use based on filters
    if (filters?.cuisineType) {
      // Query by cuisine type using GSI1
      queryParams = {
        TableName: TABLE_NAME,
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
        TableName: TABLE_NAME,
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
        TableName: TABLE_NAME,
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
    
    const result = await dynamoDb.query(queryParams).promise();
    
    // Generate next token if there are more results
    let nextToken: string | undefined;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }
    
    return {
      restaurants: (result.Items as Restaurant[]) || [],
      nextToken,
    };
  }
  
  /**
   * Add a review note to a restaurant
   */
  static async addReviewNote(
    userId: string, 
    restaurantId: string, 
    text: string
  ): Promise<ReviewNote> {
    const reviewId = uuidv4();
    const now = new Date().toISOString();
    
    // First, ensure the restaurant exists and update its visited status
    const restaurant = await this.getRestaurantById(userId, restaurantId);
    
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
    
    if (!restaurant.visited) {
      await this.updateRestaurant(userId, restaurantId, { visited: true });
    }
    
    // Create the review note
    const reviewNote: ReviewNote = {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `REVIEW#${reviewId}`,
      reviewId,
      restaurantId,
      userId,
      text,
      createdAt: now,
      updatedAt: now,
    };
    
    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: reviewNote,
    }).promise();
    
    return reviewNote;
  }
  
  /**
   * Update a restaurant's rating
   */
  static async updateRating(
    userId: string, 
    restaurantId: string, 
    rating: number
  ): Promise<Restaurant | null> {
    // Validate rating
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    
    // First, ensure the restaurant exists and update its visited status and rating
    const restaurant = await this.getRestaurantById(userId, restaurantId);
    
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
    
    return this.updateRestaurant(userId, restaurantId, { 
      visited: true,
      rating,
    });
  }
  
  /**
   * Get all review notes for a restaurant
   */
  static async getReviewNotes(restaurantId: string): Promise<ReviewNote[]> {
    const result = await dynamoDb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}`,
        ':sk': 'REVIEW#',
      },
      ScanIndexForward: false, // Sort by most recent first
    }).promise();
    
    return (result.Items as ReviewNote[]) || [];
  }
}