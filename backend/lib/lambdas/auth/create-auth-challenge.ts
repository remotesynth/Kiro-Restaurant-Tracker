import { CreateAuthChallengeTriggerEvent, CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import * as crypto from 'crypto';
import * as AWS from 'aws-sdk';

const ses = new AWS.SES();

/**
 * This Lambda function creates the authentication challenge.
 * For passwordless email authentication, we:
 * 1. Generate a random code
 * 2. Send the code to the user's email
 * 3. Store the code in the private challenge parameters
 */
export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  console.log('CREATE_AUTH_CHALLENGE_EVENT', JSON.stringify(event, null, 2));

  let secretLoginCode: string;
  if (!event.request.session || !event.request.session.length) {
    // This is a new auth session
    // Generate a new secret login code and send it to the user
    secretLoginCode = crypto.randomInt(100000, 999999).toString();
    await sendEmail(event.request.userAttributes.email, secretLoginCode);
  } else {
    // This is an existing session, use the code from the previous challenge
    const previousChallenge = event.request.session.slice(-1)[0];
    secretLoginCode = previousChallenge.challengeMetadata!.match(/CODE-(\d*)/)![1];
  }

  // Set the challenge answer based on the secret code
  event.response.publicChallengeParameters = {
    email: event.request.userAttributes.email,
  };

  // Add the secret login code to the private challenge parameters
  // so it can be verified by the verify auth challenge Lambda
  event.response.privateChallengeParameters = { secretLoginCode };

  // Add the secret login code to the session so it is available in a next invocation
  event.response.challengeMetadata = `CODE-${secretLoginCode}`;

  return event;
};

/**
 * Sends an email with the secret login code to the user
 */
async function sendEmail(emailAddress: string, secretLoginCode: string): Promise<void> {
  const params = {
    Destination: { ToAddresses: [emailAddress] },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `
            <html>
              <body>
                <h1>Restaurant Tracker Login Code</h1>
                <p>Your login code is: <strong>${secretLoginCode}</strong></p>
                <p>Enter this code in the application to log in.</p>
              </body>
            </html>
          `,
        },
        Text: {
          Charset: 'UTF-8',
          Data: `Your Restaurant Tracker login code is: ${secretLoginCode}`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Your Restaurant Tracker Login Code',
      },
    },
    Source: 'noreply@example.com', // This should be a verified email in SES
  };

  try {
    await ses.sendEmail(params).promise();
    console.log(`Email sent to ${emailAddress}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}