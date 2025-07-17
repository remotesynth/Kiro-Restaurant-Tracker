import { DefineAuthChallengeTriggerEvent, CreateAuthChallengeTriggerEvent, VerifyAuthChallengeResponseTriggerEvent } from 'aws-lambda';
import * as defineAuthChallenge from '../lib/lambdas/auth/define-auth-challenge';
import * as verifyAuthChallenge from '../lib/lambdas/auth/verify-auth-challenge';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  return {
    SES: jest.fn().mockImplementation(() => ({
      sendEmail: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    })),
  };
});

describe('Auth Lambda Functions', () => {
  describe('defineAuthChallenge', () => {
    it('should issue a custom challenge for the first session', async () => {
      const event = {
        request: {
          session: [],
        },
        response: {
          issueTokens: false,
          failAuthentication: false,
          challengeName: '',
        },
      } as unknown as DefineAuthChallengeTriggerEvent;

      const result = await defineAuthChallenge.handler(event, {} as any, () => {});

      expect(result.response.issueTokens).toBe(false);
      expect(result.response.failAuthentication).toBe(false);
      expect(result.response.challengeName).toBe('CUSTOM_CHALLENGE');
    });

    it('should issue tokens when the custom challenge is completed successfully', async () => {
      const event = {
        request: {
          session: [
            {
              challengeName: 'CUSTOM_CHALLENGE',
              challengeResult: true,
            },
          ],
        },
        response: {
          issueTokens: false,
          failAuthentication: false,
          challengeName: '',
        },
      } as unknown as DefineAuthChallengeTriggerEvent;

      const result = await defineAuthChallenge.handler(event, {} as any, () => {});

      expect(result.response.issueTokens).toBe(true);
      expect(result.response.failAuthentication).toBe(false);
    });

    it('should fail authentication when the custom challenge is not completed successfully', async () => {
      const event = {
        request: {
          session: [
            {
              challengeName: 'CUSTOM_CHALLENGE',
              challengeResult: false,
            },
          ],
        },
        response: {
          issueTokens: false,
          failAuthentication: false,
          challengeName: '',
        },
      } as unknown as DefineAuthChallengeTriggerEvent;

      const result = await defineAuthChallenge.handler(event, {} as any, () => {});

      expect(result.response.issueTokens).toBe(false);
      expect(result.response.failAuthentication).toBe(true);
    });
  });

  describe('verifyAuthChallenge', () => {
    it('should verify the challenge response correctly when the answer matches', async () => {
      const event = {
        request: {
          privateChallengeParameters: {
            secretLoginCode: '123456',
          },
          challengeAnswer: '123456',
        },
        response: {
          answerCorrect: false,
        },
      } as unknown as VerifyAuthChallengeResponseTriggerEvent;

      const result = await verifyAuthChallenge.handler(event, {} as any, () => {});

      expect(result.response.answerCorrect).toBe(true);
    });

    it('should fail verification when the answer does not match', async () => {
      const event = {
        request: {
          privateChallengeParameters: {
            secretLoginCode: '123456',
          },
          challengeAnswer: 'wrong-code',
        },
        response: {
          answerCorrect: false,
        },
      } as unknown as VerifyAuthChallengeResponseTriggerEvent;

      const result = await verifyAuthChallenge.handler(event, {} as any, () => {});

      expect(result.response.answerCorrect).toBe(false);
    });
  });
});