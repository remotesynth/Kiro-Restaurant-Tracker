import { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Wrapper for Lambda handlers to handle the callback pattern in tests
 * This allows us to call handlers with (event, context, callback) in tests
 * while the actual handlers only expect (event)
 */
export function wrapHandler<T>(handler: (event: APIGatewayProxyEvent) => Promise<T>) {
  return async (event: APIGatewayProxyEvent, _context?: Context, _callback?: any): Promise<T> => {
    return handler(event);
  };
}