import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// Define API URL from environment variables or use a default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Define the shape of the user object
interface User {
  id: string;
  email: string;
}

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authSession: string | null;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyCode: (code: string) => Promise<boolean>;
  logout: () => void;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authSession: null,
  login: async () => ({ success: false, message: 'Not implemented' }),
  verifyCode: async () => false,
  logout: () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authSession, setAuthSession] = useState<string | null>(null);

  // Check for existing session on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const session = localStorage.getItem('authSession');

        if (token) {
          const userData = JSON.parse(localStorage.getItem('userData') || '{}');
          setUser(userData);
          if (session) {
            setAuthSession(session);
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('authSession');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function - initiates the passwordless auth flow
  const login = async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      // For development mode, use a mock implementation
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        console.log(`Development mode: Simulating login for ${email}`);
        const mockUser = {
          id: 'mock-user-id',
          email: email,
        };
        localStorage.setItem('authToken', 'mock-token');
        localStorage.setItem('userData', JSON.stringify(mockUser));
        setUser(mockUser);
        setAuthSession('mock-session');
        return { success: true, message: 'Development mode: Login successful' };
      }

      // Call the backend API to initiate authentication
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate authentication');
      }

      // Store the session for later use in verification
      localStorage.setItem('tempEmail', email);
      setAuthSession(data.session);
      localStorage.setItem('authSession', data.session);

      return {
        success: true,
        message:
          'Authentication code sent to your email. Please check your inbox.',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to initiate authentication',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the authentication code
  const verifyCode = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // For development mode, use a mock implementation
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        console.log(`Development mode: Verifying code ${code}`);
        const email = localStorage.getItem('tempEmail') || 'user@example.com';
        const mockUser = {
          id: 'verified-user-id',
          email: email,
        };
        localStorage.setItem('authToken', 'verified-token');
        localStorage.setItem('userData', JSON.stringify(mockUser));
        setUser(mockUser);
        return true;
      }

      if (!authSession) {
        throw new Error('No active authentication session');
      }

      // TODO: Implement the actual verification with Cognito
      // This would typically call a backend endpoint that uses the Cognito SDK
      // to verify the challenge response

      // For now, we'll simulate a successful verification if the code is '123456'
      if (code === '123456') {
        const email = localStorage.getItem('tempEmail') || 'user@example.com';
        const userData = {
          id: 'verified-user-id',
          email: email,
        };
        localStorage.setItem('authToken', 'verified-token');
        localStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        'Verification error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('authSession');
    localStorage.removeItem('tempEmail');
    setUser(null);
    setAuthSession(null);
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authSession,
        login,
        verifyCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
