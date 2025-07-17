import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base-repository';
import { User } from './types';

/**
 * Repository for user operations
 */
export class UserRepository extends BaseRepository {
  /**
   * Create a new user
   */
  async createUser(email: string): Promise<User> {
    const userId = uuidv4();
    const now = this.getTimestamp();
    
    const user: User = {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      userId,
      email,
      createdAt: now,
      updatedAt: now,
    };
    
    return this.create<User>(user);
  }
  
  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.get<User>({
      PK: `USER#${userId}`,
      SK: 'METADATA',
    });
  }
  
  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.scan<User>({
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    });
    
    if (result.items.length > 0) {
      return result.items[0];
    }
    
    return null;
  }
  
  /**
   * Update a user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    return this.update<User>(
      {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
      updates
    );
  }
  
  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    await this.delete({
      PK: `USER#${userId}`,
      SK: 'METADATA',
    });
  }
}