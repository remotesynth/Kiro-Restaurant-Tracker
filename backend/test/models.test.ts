import { UserRepository } from '../lib/models/user-repository';
import { RestaurantRepository } from '../lib/models/restaurant-repository';
import { CuisineType } from '../lib/models/types';

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
      promise: jest.fn().mockResolvedValue({ Items: [] }),
    }),
    scan: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Items: [] }),
    }),
    batchWrite: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    batchGet: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Responses: {} }),
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
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

// Set environment variables
process.env.TABLE_NAME = 'test-table';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDynamoDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository();
    mockDynamoDb = require('aws-sdk').DynamoDB.DocumentClient();
  });

  describe('createUser', () => {
    it('should create a user with the correct parameters', async () => {
      const email = 'test@example.com';
      const result = await userRepository.createUser(email);

      expect(mockDynamoDb.put).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: expect.objectContaining({
          PK: 'USER#mock-uuid',
          SK: 'METADATA',
          userId: 'mock-uuid',
          email,
        }),
      });

      expect(result).toEqual(expect.objectContaining({
        PK: 'USER#mock-uuid',
        SK: 'METADATA',
        userId: 'mock-uuid',
        email,
      }));
    });
  });

  describe('getUserById', () => {
    it('should get a user by ID with the correct parameters', async () => {
      const userId = 'test-user-id';
      await userRepository.getUserById(userId);

      expect(mockDynamoDb.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA',
        },
      });
    });
  });

  describe('getUserByEmail', () => {
    it('should scan for a user by email with the correct parameters', async () => {
      const email = 'test@example.com';
      await userRepository.getUserByEmail(email);

      expect(mockDynamoDb.scan).toHaveBeenCalledWith({
        TableName: 'test-table',
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      });
    });
  });

  describe('updateUser', () => {
    it('should update a user with the correct parameters', async () => {
      const userId = 'test-user-id';
      const updates = { email: 'updated@example.com' };
      await userRepository.updateUser(userId, updates);

      expect(mockDynamoDb.update).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA',
        },
        UpdateExpression: expect.stringContaining('email'),
        ExpressionAttributeNames: expect.objectContaining({
          '#email': 'email',
        }),
        ExpressionAttributeValues: expect.objectContaining({
          ':email': 'updated@example.com',
        }),
      }));
    });
  });

  describe('deleteUser', () => {
    it('should delete a user with the correct parameters', async () => {
      const userId = 'test-user-id';
      await userRepository.deleteUser(userId);

      expect(mockDynamoDb.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA',
        },
      });
    });
  });
});

describe('RestaurantRepository', () => {
  let restaurantRepository: RestaurantRepository;
  let mockDynamoDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    restaurantRepository = new RestaurantRepository();
    mockDynamoDb = require('aws-sdk').DynamoDB.DocumentClient();
  });

  describe('createRestaurant', () => {
    it('should create a restaurant with the correct parameters', async () => {
      const userId = 'test-user-id';
      const name = 'Test Restaurant';
      const location = 'Test Location';
      const cuisineType = CuisineType.ITALIAN;
      const description = 'Test Description';

      const result = await restaurantRepository.createRestaurant(
        userId,
        name,
        location,
        cuisineType,
        description
      );

      expect(mockDynamoDb.put).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: expect.objectContaining({
          PK: `USER#${userId}`,
          SK: 'RESTAURANT#mock-uuid',
          restaurantId: 'mock-uuid',
          userId,
          name,
          location,
          cuisineType,
          description,
          visited: false,
        }),
      });

      expect(result).toEqual(expect.objectContaining({
        PK: `USER#${userId}`,
        SK: 'RESTAURANT#mock-uuid',
        restaurantId: 'mock-uuid',
        userId,
        name,
        location,
        cuisineType,
        description,
        visited: false,
      }));
    });
  });

  describe('getRestaurantById', () => {
    it('should get a restaurant by ID with the correct parameters', async () => {
      const userId = 'test-user-id';
      const restaurantId = 'test-restaurant-id';
      await restaurantRepository.getRestaurantById(userId, restaurantId);

      expect(mockDynamoDb.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: `RESTAURANT#${restaurantId}`,
        },
      });
    });
  });

  describe('updateRestaurant', () => {
    it('should update a restaurant with the correct parameters', async () => {
      const userId = 'test-user-id';
      const restaurantId = 'test-restaurant-id';
      const updates = { 
        name: 'Updated Restaurant',
        visited: true,
        rating: 5,
      };
      
      await restaurantRepository.updateRestaurant(userId, restaurantId, updates);

      expect(mockDynamoDb.update).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: `RESTAURANT#${restaurantId}`,
        },
        UpdateExpression: expect.stringContaining('name'),
        ExpressionAttributeNames: expect.objectContaining({
          '#name': 'name',
          '#visited': 'visited',
          '#rating': 'rating',
        }),
        ExpressionAttributeValues: expect.objectContaining({
          ':name': 'Updated Restaurant',
          ':visited': true,
          ':rating': 5,
        }),
      }));
    });
  });

  describe('deleteRestaurant', () => {
    it('should delete a restaurant with the correct parameters', async () => {
      const userId = 'test-user-id';
      const restaurantId = 'test-restaurant-id';
      await restaurantRepository.deleteRestaurant(userId, restaurantId);

      expect(mockDynamoDb.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: `RESTAURANT#${restaurantId}`,
        },
      });
    });
  });

  describe('listRestaurants', () => {
    it('should list all restaurants for a user with the correct parameters', async () => {
      const userId = 'test-user-id';
      await restaurantRepository.listRestaurants(userId);

      expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'RESTAURANT#',
        },
      }));
    });

    it('should list restaurants by cuisine type with the correct parameters', async () => {
      const userId = 'test-user-id';
      const filters = { cuisineType: CuisineType.ITALIAN };
      await restaurantRepository.listRestaurants(userId, filters);

      expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: 'userId = :userId AND cuisineType = :cuisineType',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':cuisineType': CuisineType.ITALIAN,
        },
      }));
    });

    it('should list restaurants by visited status with the correct parameters', async () => {
      const userId = 'test-user-id';
      const filters = { visited: true };
      await restaurantRepository.listRestaurants(userId, filters);

      expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        IndexName: 'GSI2',
        KeyConditionExpression: 'userId = :userId AND visited = :visited',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':visited': 'true',
        },
      }));
    });

    it('should list restaurants with search term with the correct parameters', async () => {
      const userId = 'test-user-id';
      const filters = { searchTerm: 'pizza' };
      await restaurantRepository.listRestaurants(userId, filters);

      expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'contains(#name, :searchTerm)',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'RESTAURANT#',
          ':searchTerm': 'pizza',
        },
      }));
    });

    it('should list restaurants with pagination parameters', async () => {
      const userId = 'test-user-id';
      const paginationParams = { limit: 10, nextToken: 'mock-token' };
      
      // Mock the Buffer.from for the nextToken
      const mockParsedToken = { PK: 'USER#test-user-id', SK: 'RESTAURANT#last-id' };
      jest.spyOn(Buffer, 'from').mockImplementation((str: any, encoding?: any) => {
        if (str === 'mock-token') {
          return {
            toString: () => JSON.stringify(mockParsedToken),
          } as unknown as Buffer;
        }
        return Buffer.from(str);
      });
      
      await restaurantRepository.listRestaurants(userId, undefined, paginationParams);

      expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'RESTAURANT#',
        },
        Limit: 10,
        ExclusiveStartKey: mockParsedToken,
      }));
    });
  });

  describe('updateRating', () => {
    it('should update a restaurant rating with the correct parameters', async () => {
      const userId = 'test-user-id';
      const restaurantId = 'test-restaurant-id';
      const rating = 4;
      
      await restaurantRepository.updateRating(userId, restaurantId, rating);

      expect(mockDynamoDb.update).toHaveBeenCalledWith(expect.objectContaining({
        TableName: 'test-table',
        Key: {
          PK: `USER#${userId}`,
          SK: `RESTAURANT#${restaurantId}`,
        },
        UpdateExpression: expect.stringContaining('rating'),
        ExpressionAttributeNames: expect.objectContaining({
          '#visited': 'visited',
          '#rating': 'rating',
        }),
        ExpressionAttributeValues: expect.objectContaining({
          ':visited': true,
          ':rating': 4,
        }),
      }));
    });

    it('should throw an error if rating is out of range', async () => {
      const userId = 'test-user-id';
      const restaurantId = 'test-restaurant-id';
      const rating = 6; // Out of range
      
      await expect(restaurantRepository.updateRating(userId, restaurantId, rating))
        .rejects
        .toThrow('Rating must be between 0 and 5');
    });
  });
});