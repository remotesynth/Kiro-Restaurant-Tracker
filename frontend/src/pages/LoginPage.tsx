import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const { login, verifyCode, authSession } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setMessage('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const result = await login(email);
      if (result.success) {
        setShowVerification(true);
        setMessage(result.message);
      } else {
        setMessage(
          result.message ||
            'Failed to send verification code. Please try again.'
        );
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setMessage('Please enter the verification code from your email');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const success = await verifyCode(verificationCode);
      if (success) {
        setMessage('Verification successful! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setMessage('Invalid verification code. Please try again.');
      }
    } catch (error) {
      setMessage('An error occurred during verification. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setShowVerification(false);
    setVerificationCode('');
    setMessage('');
  };

  return (
    <div className="login-page">
      <h1>Login to Restaurant Tracker</h1>

      {!showVerification ? (
        <>
          <p>
            Enter your email to receive a verification code for passwordless
            login.
          </p>
          <form onSubmit={handleEmailSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Verification Code'}
            </button>

            {message && <div className="message">{message}</div>}
          </form>
        </>
      ) : (
        <>
          <p>Enter the verification code sent to your email.</p>
          <form onSubmit={handleVerificationSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="verificationCode">Verification Code</label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                disabled={isSubmitting}
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              className="back-button"
              onClick={handleBackToEmail}
              disabled={isSubmitting}
              style={{
                marginTop: '10px',
                background: 'transparent',
                border: 'none',
                color: '#3498db',
                cursor: 'pointer',
              }}
            >
              Back to Email Entry
            </button>

            {message && <div className="message">{message}</div>}
          </form>
        </>
      )}
    </div>
  );
};

export default LoginPage;
