import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler as addReviewNoteHandlerOriginal } from '../lib/lambdas/reviews/add-review-note';
import { handler as updateRatingHandlerOriginal } from '../lib/lambdas/reviews/update-rating';
import { handler as getReviewsHandlerOriginal } from '../lib/lambdas/reviews/get-reviews';
import { RestaurantRepository } from '../lib/models/restaurant-repository';
import { CuisineType } from '../lib/models/types';
import { wrapHandler } from './test-utils';

// Wrap the handlers to support the callback pattern in tests
const addReviewNoteHandler = wrapHandler(addReviewNoteHandlerOriginal);
const updateRatingHandler = wrapHandler(updateRatingHandlerOriginal);
const getReviewsHandler = wrapHandler(getReviewsHandlerOriginal);

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockDynamoDb = {
    put: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    get: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    update: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    delete: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    query: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: [
          {
            reviewId: 'mock-review-id-1',
            text: 'Great restaurant!',
            createdAt: '2023-01-01T00:00:00.000Z',
          },
          {
            reviewId: 'mock-review-id-2',
            text: 'Excellent food!',
            createdAt: '2023-01-02T00:00:00.000Z',
          },
        ],
      }),
    }),
    scan: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Items: [] }),
    }),
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDb),
    },
  };
});

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-review-id'),
}));

// Mock RestaurantRepository
jest.mock('../lib/models/restaurant-repository', () => {
  return {
    RestaurantRepository: jest.fn().mockImplementation(() => ({
      getRestaurantById: jest.fn().mockImplementation((userId, restaurantId) => {
        if (restaurantId === 'not-found') {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          restaurantId,
          userId,
          name: 'Test Restaurant',
          location: 'Test Location',
          cuisineType: CuisineType.ITALIAN,
          description: 'Test Description',
          visited: restaurantId === 'visited',
          rating: restaurantId === 'visited' ? 4 : null,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        });
      }),
      updateRestaurant: jest.fn().mockImplementation((userId, restaurantId, updates) => {
        if (restaurantId === 'not-found') {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          restaurantId,
          userId,
          name: 'Test Restaurant',
          location: 'Test Location',
          cuisineType: CuisineType.ITALIAN,
          description: 'Test Description',
          visited: updates.visited !== undefined ? updates.visited : false,
          rating: updates.rating !== undefined ? updates.rating : null,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        });
      }),
      updateRating: jest.fn().mockImplementation((userId, restaurantId, rating) => {
        if (restaurantId === 'not-found') {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          restaurantId,
          userId,
          name: 'Test Restaurant',
          location: 'Test Location',
          cuisineType: CuisineType.ITALIAN,
          description: 'Test Description',
          visited: true,
          rating,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        });
      }),
    })),
  };
});

// Set environment variables
process.env.TABLE_NAME = 'test-table';

// Helper function to create a mock API Gateway event
const createMockEvent = (
  method: string,
  path: string,
  pathParameters?: Record<string, string>,
  queryStringParameters?: Record<string, string>,
  body?: any,
  userId: string = 'test-user-id'
): APIGatewayProxyEvent => {
  return {
    httpMethod: method,
    path,
    pathParameters: pathParameters || null,
    queryStringParameters: queryStringParameters || null,
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    resource: '',
    stageVariables: null,
    requestContext: {
      accountId: '',
      apiId: '',
      authorizer: {
        claims: {
          sub: userId,
          email: 'test@example.com',
        },
      },
      protocol: '',
      httpMethod: method,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '',
        user: null,
        userAgent: null,
        userArn: null,
      },
      path,
      stage: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
    },
    multiValueQueryStringParameters: null,
  } as unknown as APIGatewayProxyEvent;
};

describe('Review API', () => {
  const mockContext = {} as Context;
  
  describe('addReviewNote', () => {
    it('should add a review note successfully', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants/test-restaurant-id/reviews',
        { restaurantId: 'test-restaurant-id' },
        undefined,
        {
          text: 'Great restaurant!',
        }
      );
      
      const result = await addReviewNoteHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 201,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        reviewId: 'mock-review-id',
        text: 'Great restaurant!',
        createdAt: expect.any(String),
      }));
      
      // Verify that the restaurant was marked as visited if it wasn't already
      const repository = new RestaurantRepository();
      expect(repository.updateRestaurant).toHaveBeenCalledWith(
        'test-user-id',
        'test-restaurant-id',
        { visited: true }
      );
    });
    
    it('should not update visited status if restaurant is already visited', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants/visited/reviews',
        { restaurantId: 'visited' },
        undefined,
        {
          text: 'Great restaurant!',
        }
      );
      
      const result = await addReviewNoteHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 201,
        body: expect.any(String),
      }));
      
      // Verify that the restaurant's visited status was not updated
      const repository = new RestaurantRepository();
      expect(repository.updateRestaurant).not.toHaveBeenCalled();
    });
    
    it('should return 400 if review text is missing', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants/test-restaurant-id/reviews',
        { restaurantId: 'test-restaurant-id' },
        undefined,
        {}
      );
      
      const result = await addReviewNoteHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Review text is required'),
      }));
    });
    
    it('should return 404 if restaurant is not found', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants/not-found/reviews',
        { restaurantId: 'not-found' },
        undefined,
        {
          text: 'Great restaurant!',
        }
      );
      
      const result = await addReviewNoteHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 404,
        body: expect.stringContaining('Restaurant not found'),
      }));
    });
  });
  
  describe('updateRating', () => {
    it('should update a restaurant rating successfully', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/test-restaurant-id/rating',
        { restaurantId: 'test-restaurant-id' },
        undefined,
        {
          rating: 5,
        }
      );
      
      const result = await updateRatingHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurantId: 'test-restaurant-id',
        rating: 5,
        visited: true,
      }));
      
      // Verify that the rating was updated
      const repository = new RestaurantRepository();
      expect(repository.updateRating).toHaveBeenCalledWith(
        'test-user-id',
        'test-restaurant-id',
        5
      );
    });
    
    it('should return 400 if rating is missing', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/test-restaurant-id/rating',
        { restaurantId: 'test-restaurant-id' },
        undefined,
        {}
      );
      
      const result = await updateRatingHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Rating is required'),
      }));
    });
    
    it('should return 400 if rating is out of range', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/test-restaurant-id/rating',
        { restaurantId: 'test-restaurant-id' },
        undefined,
        {
          rating: 6,
        }
      );
      
      const result = await updateRatingHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Rating must be between 0 and 5'),
      }));
    });
    
    it('should return 404 if restaurant is not found', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/not-found/rating',
        { restaurantId: 'not-found' },
        undefined,
        {
          rating: 5,
        }
      );
      
      const result = await updateRatingHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 404,
        body: expect.stringContaining('Restaurant not found'),
      }));
    });
  });
  
  describe('getReviews', () => {
    it('should get reviews for a restaurant successfully', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants/test-restaurant-id/reviews',
        { restaurantId: 'test-restaurant-id' }
      );
      
      const result = await getReviewsHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        reviews: expect.arrayContaining([
          expect.objectContaining({
            reviewId: 'mock-review-id-1',
            text: 'Great restaurant!',
          }),
          expect.objectContaining({
            reviewId: 'mock-review-id-2',
            text: 'Excellent food!',
          }),
        ]),
      }));
      
      expect(body.reviews).toHaveLength(2);
    });
    
    it('should return 404 if restaurant is not found', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants/not-found/reviews',
        { restaurantId: 'not-found' }
      );
      
      const result = await getReviewsHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 404,
        body: expect.stringContaining('Restaurant not found'),
      }));
    });
  });
});