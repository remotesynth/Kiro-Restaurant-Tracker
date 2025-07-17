import { VerifyAuthChallengeResponseTriggerEvent, VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';

/**
 * This Lambda function verifies the authentication challenge response.
 * It checks if the code provided by the user matches the code that was sent.
 */
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  console.log('VERIFY_AUTH_CHALLENGE_RESPONSE_EVENT', JSON.stringify(event, null, 2));

  const expectedAnswer = event.request.privateChallengeParameters?.secretLoginCode;
  const providedAnswer = event.request.challengeAnswer;

  event.response.answerCorrect = expectedAnswer === providedAnswer;

  return event;
};