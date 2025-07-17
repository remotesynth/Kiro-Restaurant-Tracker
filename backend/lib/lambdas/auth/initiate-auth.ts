import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const cognito = new AWS.CognitoIdentityServiceProvider();

/**
 * This Lambda function initiates the authentication process.
 * It handles both sign-up and sign-in for passwordless authentication.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const { email } = JSON.parse(event.body);
    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Email is required' }),
      };
    }

    // Get environment variables
    const userPoolId = process.env.USER_POOL_ID;
    const clientId = process.env.USER_POOL_CLIENT_ID;

    if (!userPoolId || !clientId) {
      console.error('Missing required environment variables');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Server configuration error' }),
      };
    }

    // Check if the user exists
    let userExists = false;
    try {
      await cognito.adminGetUser({
        UserPoolId: userPoolId,
        Username: email,
      }).promise();
      userExists = true;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code !== 'UserNotFoundException') {
        throw error;
      }
    }

    // If the user doesn't exist, create them
    if (!userExists) {
      await cognito.adminCreateUser({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
          {
            Name: 'email_verified',
            Value: 'true',
          },
          {
            Name: 'custom:isPasswordless',
            Value: 'true',
          },
        ],
        MessageAction: 'SUPPRESS', // Don't send welcome email
      }).promise();

      // Set a temporary password for the user (required by Cognito)
      await cognito.adminSetUserPassword({
        UserPoolId: userPoolId,
        Username: email,
        Password: generateRandomPassword(),
        Permanent: true,
      }).promise();
    }

    // Initiate auth with custom auth flow
    const authResponse = await cognito.initiateAuth({
      AuthFlow: 'CUSTOM_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
      },
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Authentication initiated',
        session: authResponse.Session,
        email,
      }),
    };
  } catch (error: unknown) {
    console.error('Error initiating auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Error initiating authentication', error: errorMessage }),
    };
  }
};

/**
 * Generates a random password that meets Cognito's requirements
 */
function generateRandomPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  // Add at least one of each required character type
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));

  // Add more random characters to meet the minimum length
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}