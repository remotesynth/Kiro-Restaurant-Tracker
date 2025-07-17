import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler as createRestaurantHandlerOriginal } from '../lib/lambdas/restaurants/create-restaurant';
import { handler as getRestaurantHandlerOriginal } from '../lib/lambdas/restaurants/get-restaurant';
import { handler as listRestaurantsHandlerOriginal } from '../lib/lambdas/restaurants/list-restaurants';
import { handler as updateRestaurantHandlerOriginal } from '../lib/lambdas/restaurants/update-restaurant';
import { CuisineType } from '../lib/models/types';
import { wrapHandler } from './test-utils';

// Wrap the handlers to support the callback pattern in tests
const createRestaurantHandler = wrapHandler(createRestaurantHandlerOriginal);
const getRestaurantHandler = wrapHandler(getRestaurantHandlerOriginal);
const listRestaurantsHandler = wrapHandler(listRestaurantsHandlerOriginal);
const updateRestaurantHandler = wrapHandler(updateRestaurantHandlerOriginal);

// Mock the RestaurantRepository
jest.mock('../lib/models/restaurant-repository', () => {
  return {
    RestaurantRepository: jest.fn().mockImplementation(() => ({
      createRestaurant: jest.fn().mockImplementation((userId, name, location, cuisineType, description) => {
        return Promise.resolve({
          restaurantId: 'mock-restaurant-id',
          userId,
          name,
          location,
          cuisineType,
          description,
          visited: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        });
      }),
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
          visited: false,
          rating: null,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        });
      }),
      listRestaurants: jest.fn().mockImplementation((userId, filters, paginationParams) => {
        return Promise.resolve({
          restaurants: [
            {
              restaurantId: 'mock-restaurant-id-1',
              userId,
              name: 'Test Restaurant 1',
              location: 'Test Location 1',
              cuisineType: CuisineType.ITALIAN,
              description: 'Test Description 1',
              visited: false,
              rating: null,
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            },
            {
              restaurantId: 'mock-restaurant-id-2',
              userId,
              name: 'Test Restaurant 2',
              location: 'Test Location 2',
              cuisineType: CuisineType.JAPANESE,
              description: 'Test Description 2',
              visited: true,
              rating: 4,
              createdAt: '2023-01-02T00:00:00.000Z',
              updatedAt: '2023-01-02T00:00:00.000Z',
            },
          ],
          nextToken: filters?.searchTerm ? 'mock-next-token' : undefined,
        });
      }),
      updateRestaurant: jest.fn().mockImplementation((userId, restaurantId, updates) => {
        if (restaurantId === 'not-found') {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          restaurantId,
          userId,
          name: updates.name || 'Test Restaurant',
          location: updates.location || 'Test Location',
          cuisineType: updates.cuisineType || CuisineType.ITALIAN,
          description: updates.description || 'Test Description',
          visited: updates.visited !== undefined ? updates.visited : false,
          rating: updates.rating !== undefined ? updates.rating : null,
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

describe('Restaurant API', () => {
  const mockContext = {} as Context;
  
  describe('createRestaurant', () => {
    it('should create a restaurant successfully', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants',
        undefined,
        undefined,
        {
          name: 'New Restaurant',
          location: 'New Location',
          cuisineType: CuisineType.ITALIAN,
          description: 'New Description',
        }
      );
      
      const result = await createRestaurantHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 201,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurantId: 'mock-restaurant-id',
        name: 'New Restaurant',
        location: 'New Location',
        cuisineType: CuisineType.ITALIAN,
        description: 'New Description',
        visited: false,
      }));
    });
    
    it('should return 400 if name is missing', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants',
        undefined,
        undefined,
        {
          location: 'New Location',
          cuisineType: CuisineType.ITALIAN,
          description: 'New Description',
        }
      );
      
      const result = await createRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Restaurant name is required'),
      }));
    });
    
    it('should return 400 if cuisine type is invalid', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants',
        undefined,
        undefined,
        {
          name: 'New Restaurant',
          location: 'New Location',
          cuisineType: 'INVALID_CUISINE',
          description: 'New Description',
        }
      );
      
      const result = await createRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Invalid cuisine type'),
      }));
    });
    
    it('should return 401 if user is not authenticated', async () => {
      const event = createMockEvent(
        'POST',
        '/restaurants',
        undefined,
        undefined,
        {
          name: 'New Restaurant',
          location: 'New Location',
          cuisineType: CuisineType.ITALIAN,
          description: 'New Description',
        },
        undefined as unknown as string
      );
      
      const result = await createRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 401,
        body: expect.stringContaining('Unauthorized'),
      }));
    });
  });
  
  describe('getRestaurant', () => {
    it('should get a restaurant successfully', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants/mock-restaurant-id',
        { restaurantId: 'mock-restaurant-id' }
      );
      
      const result = await getRestaurantHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurantId: 'mock-restaurant-id',
        name: 'Test Restaurant',
        location: 'Test Location',
        cuisineType: CuisineType.ITALIAN,
        description: 'Test Description',
        visited: false,
      }));
    });
    
    it('should return 404 if restaurant is not found', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants/not-found',
        { restaurantId: 'not-found' }
      );
      
      const result = await getRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 404,
        body: expect.stringContaining('Restaurant not found'),
      }));
    });
    
    it('should return 400 if restaurant ID is missing', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants/',
        {}
      );
      
      const result = await getRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Restaurant ID is required'),
      }));
    });
  });
  
  describe('listRestaurants', () => {
    it('should list restaurants successfully', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants',
        undefined,
        undefined
      );
      
      const result = await listRestaurantsHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurants: expect.arrayContaining([
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-1',
            name: 'Test Restaurant 1',
          }),
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-2',
            name: 'Test Restaurant 2',
          }),
        ]),
      }));
      
      expect(body.restaurants).toHaveLength(2);
    });
    
    it('should filter restaurants by cuisine type', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants',
        undefined,
        { cuisineType: CuisineType.ITALIAN }
      );
      
      const result = await listRestaurantsHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurants: expect.arrayContaining([
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-1',
            name: 'Test Restaurant 1',
          }),
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-2',
            name: 'Test Restaurant 2',
          }),
        ]),
      }));
    });
    
    it('should filter restaurants by visited status', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants',
        undefined,
        { visited: 'true' }
      );
      
      const result = await listRestaurantsHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurants: expect.arrayContaining([
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-1',
            name: 'Test Restaurant 1',
          }),
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-2',
            name: 'Test Restaurant 2',
          }),
        ]),
      }));
    });
    
    it('should search restaurants by name', async () => {
      const event = createMockEvent(
        'GET',
        '/restaurants',
        undefined,
        { searchTerm: 'Test' }
      );
      
      const result = await listRestaurantsHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurants: expect.arrayContaining([
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-1',
            name: 'Test Restaurant 1',
          }),
          expect.objectContaining({
            restaurantId: 'mock-restaurant-id-2',
            name: 'Test Restaurant 2',
          }),
        ]),
        nextToken: 'mock-next-token',
      }));
    });
  });
  
  describe('updateRestaurant', () => {
    it('should update a restaurant successfully', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/mock-restaurant-id',
        { restaurantId: 'mock-restaurant-id' },
        undefined,
        {
          name: 'Updated Restaurant',
          location: 'Updated Location',
          cuisineType: CuisineType.FRENCH,
          description: 'Updated Description',
          visited: true,
          rating: 5,
        }
      );
      
      const result = await updateRestaurantHandler(event, mockContext, () => {});
      const body = JSON.parse((result as APIGatewayProxyResult).body);
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 200,
        body: expect.any(String),
      }));
      
      expect(body).toEqual(expect.objectContaining({
        restaurantId: 'mock-restaurant-id',
        name: 'Updated Restaurant',
        location: 'Updated Location',
        cuisineType: CuisineType.FRENCH,
        description: 'Updated Description',
        visited: true,
        rating: 5,
      }));
    });
    
    it('should return 404 if restaurant is not found', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/not-found',
        { restaurantId: 'not-found' },
        undefined,
        {
          name: 'Updated Restaurant',
        }
      );
      
      const result = await updateRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 404,
        body: expect.stringContaining('Restaurant not found'),
      }));
    });
    
    it('should return 400 if restaurant ID is missing', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/',
        {},
        undefined,
        {
          name: 'Updated Restaurant',
        }
      );
      
      const result = await updateRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Restaurant ID is required'),
      }));
    });
    
    it('should return 400 if cuisine type is invalid', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/mock-restaurant-id',
        { restaurantId: 'mock-restaurant-id' },
        undefined,
        {
          cuisineType: 'INVALID_CUISINE',
        }
      );
      
      const result = await updateRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Invalid cuisine type'),
      }));
    });
    
    it('should return 400 if rating is out of range', async () => {
      const event = createMockEvent(
        'PUT',
        '/restaurants/mock-restaurant-id',
        { restaurantId: 'mock-restaurant-id' },
        undefined,
        {
          rating: 6,
        }
      );
      
      const result = await updateRestaurantHandler(event, mockContext, () => {});
      
      expect(result).toEqual(expect.objectContaining({
        statusCode: 400,
        body: expect.stringContaining('Rating must be between 0 and 5'),
      }));
    });
  });
});