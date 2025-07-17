import * as AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

/**
 * Base repository class for DynamoDB operations
 */
export abstract class BaseRepository {
  protected readonly dynamoDb: AWS.DynamoDB.DocumentClient;
  protected readonly tableName: string;

  constructor() {
    this.dynamoDb = new AWS.DynamoDB.DocumentClient();
    this.tableName = process.env.TABLE_NAME || '';
    
    if (!this.tableName) {
      throw new Error('TABLE_NAME environment variable is not set');
    }
  }

  /**
   * Generate a timestamp for the current time
   */
  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a new item in DynamoDB
   */
  protected async create<T extends AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap>(item: T): Promise<T> {
    await this.dynamoDb.put({
      TableName: this.tableName,
      Item: item,
    }).promise();
    
    return item;
  }

  /**
   * Get an item from DynamoDB by key
   */
  protected async get<T>(key: DocumentClient.Key): Promise<T | null> {
    const result = await this.dynamoDb.get({
      TableName: this.tableName,
      Key: key,
    }).promise();
    
    return (result.Item as T) || null;
  }

  /**
   * Update an item in DynamoDB
   */
  protected async update<T>(
    key: DocumentClient.Key,
    updates: Partial<T>,
    conditionExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<T | null> {
    // Build update expression
    const updateExpressions: string[] = [];
    const names: Record<string, string> = expressionAttributeNames || {};
    const values: Record<string, any> = expressionAttributeValues || {};
    
    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = this.getTimestamp();
    
    // Add other updates
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'PK' && key !== 'SK' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = value;
      }
    });
    
    // Update the item
    const params: DocumentClient.UpdateItemInput = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    };
    
    if (conditionExpression) {
      params.ConditionExpression = conditionExpression;
    }
    
    try {
      const result = await this.dynamoDb.update(params).promise();
      return result.Attributes as T;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ConditionalCheckFailedException') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete an item from DynamoDB
   */
  protected async delete(key: DocumentClient.Key): Promise<void> {
    await this.dynamoDb.delete({
      TableName: this.tableName,
      Key: key,
    }).promise();
  }

  /**
   * Query items from DynamoDB
   */
  protected async query<T>(params: DocumentClient.QueryInput): Promise<{ items: T[]; nextToken?: string }> {
    const result = await this.dynamoDb.query({
      ...params,
      TableName: this.tableName,
    }).promise();
    
    // Generate next token if there are more results
    let nextToken: string | undefined;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }
    
    return {
      items: (result.Items as T[]) || [],
      nextToken,
    };
  }

  /**
   * Scan items from DynamoDB
   */
  protected async scan<T>(params: Omit<DocumentClient.ScanInput, 'TableName'>): Promise<{ items: T[]; nextToken?: string }> {
    const result = await this.dynamoDb.scan({
      ...params,
      TableName: this.tableName,
    }).promise();
    
    // Generate next token if there are more results
    let nextToken: string | undefined;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }
    
    return {
      items: (result.Items as T[]) || [],
      nextToken,
    };
  }

  /**
   * Batch write items to DynamoDB
   */
  protected async batchWrite<T extends AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap>(items: T[]): Promise<void> {
    // DynamoDB batch write has a limit of 25 items per request
    const batchSize = 25;
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    for (const batch of batches) {
      const params: DocumentClient.BatchWriteItemInput = {
        RequestItems: {
          [this.tableName]: batch.map(item => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      };
      
      await this.dynamoDb.batchWrite(params).promise();
    }
  }

  /**
   * Batch get items from DynamoDB
   */
  protected async batchGet<T>(keys: DocumentClient.Key[]): Promise<T[]> {
    // DynamoDB batch get has a limit of 100 items per request
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    const results: T[] = [];
    
    for (const batch of batches) {
      const params: DocumentClient.BatchGetItemInput = {
        RequestItems: {
          [this.tableName]: {
            Keys: batch,
          },
        },
      };
      
      const result = await this.dynamoDb.batchGet(params).promise();
      
      if (result.Responses && result.Responses[this.tableName]) {
        results.push(...(result.Responses[this.tableName] as T[]));
      }
    }
    
    return results;
  }
}