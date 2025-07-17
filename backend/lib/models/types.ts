/**
 * Data models for the Restaurant Tracker application
 */

// Cuisine types
export enum CuisineType {
  AMERICAN = 'American',
  CHINESE = 'Chinese',
  FRENCH = 'French',
  GREEK = 'Greek',
  INDIAN = 'Indian',
  ITALIAN = 'Italian',
  JAPANESE = 'Japanese',
  KOREAN = 'Korean',
  MEDITERRANEAN = 'Mediterranean',
  MEXICAN = 'Mexican',
  MIDDLE_EASTERN = 'Middle Eastern',
  THAI = 'Thai',
  VIETNAMESE = 'Vietnamese',
  OTHER = 'Other',
}

// Base interface for all DynamoDB items
export interface DynamoDBItem {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
}

// User model
export interface User extends DynamoDBItem {
  userId: string;
  email: string;
  // PK: USER#{userId}
  // SK: METADATA
}

// Restaurant model
export interface Restaurant extends DynamoDBItem {
  restaurantId: string;
  userId: string;
  name: string;
  location?: string;
  cuisineType?: CuisineType;
  description?: string;
  visited: boolean;
  rating?: number; // 0-5 stars
  // PK: USER#{userId}
  // SK: RESTAURANT#{restaurantId}
  // GSI1: userId, cuisineType
  // GSI2: userId, visited
}

// Review note model
export interface ReviewNote extends DynamoDBItem {
  reviewId: string;
  restaurantId: string;
  userId: string;
  text: string;
  // PK: RESTAURANT#{restaurantId}
  // SK: REVIEW#{reviewId}
}

// DynamoDB access patterns:
// 1. Get user by ID: Query PK=USER#{userId}, SK=METADATA
// 2. Get all restaurants for a user: Query PK=USER#{userId}, SK begins_with RESTAURANT#
// 3. Get restaurant by ID: Query PK=USER#{userId}, SK=RESTAURANT#{restaurantId}
// 4. Get all restaurants by cuisine type: Query GSI1, PK=userId, SK=cuisineType
// 5. Get all restaurants by visited status: Query GSI2, PK=userId, SK=visited
// 6. Get all reviews for a restaurant: Query PK=RESTAURANT#{restaurantId}, SK begins_with REVIEW#

// Request/Response types for API

export interface CreateRestaurantRequest {
  name: string;
  location?: string;
  cuisineType?: CuisineType;
  description?: string;
}

export interface UpdateRestaurantRequest {
  name?: string;
  location?: string;
  cuisineType?: CuisineType;
  description?: string;
  visited?: boolean;
  rating?: number;
}

export interface CreateReviewRequest {
  text: string;
}

export interface UpdateRatingRequest {
  rating: number;
}

export interface RestaurantResponse {
  restaurantId: string;
  name: string;
  location?: string;
  cuisineType?: CuisineType;
  description?: string;
  visited: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewNoteResponse {
  reviewId: string;
  text: string;
  createdAt: string;
}

export interface RestaurantDetailResponse extends RestaurantResponse {
  reviews: ReviewNoteResponse[];
}

export interface ListRestaurantsResponse {
  restaurants: RestaurantResponse[];
  nextToken?: string;
}

// Filter types for querying restaurants
export interface RestaurantFilters {
  cuisineType?: CuisineType;
  visited?: boolean;
  searchTerm?: string;
}

// Pagination parameters
export interface PaginationParams {
  limit?: number;
  nextToken?: string;
}