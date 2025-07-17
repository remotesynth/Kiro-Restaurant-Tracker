import { DefineAuthChallengeTriggerEvent, DefineAuthChallengeTriggerHandler } from 'aws-lambda';

/**
 * This Lambda function defines the authentication challenge flow.
 * For passwordless email authentication, we use a custom challenge flow:
 * 1. First challenge: Send magic link to user's email
 * 2. Second challenge: Verify the code from the magic link
 */
export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  console.log('DEFINE_AUTH_CHALLENGE_EVENT', JSON.stringify(event, null, 2));

  if (event.request.session && event.request.session.length === 0) {
    // This is the first challenge, issue the custom challenge
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  } else if (
    event.request.session &&
    event.request.session.length === 1 &&
    event.request.session[0].challengeName === 'CUSTOM_CHALLENGE' &&
    event.request.session[0].challengeResult === true
  ) {
    // The user successfully completed the custom challenge, issue tokens
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else {
    // The user did not successfully complete the custom challenge
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  }

  return event;
};