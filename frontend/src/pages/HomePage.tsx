import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <h1>Welcome to Restaurant Tracker</h1>
      <p>Keep track of restaurants you want to visit and your experiences.</p>

      {isAuthenticated ? (
        <div className="cta-container">
          <Link to="/restaurants" className="cta-button">
            View My Restaurants
          </Link>
        </div>
      ) : (
        <div className="cta-container">
          <Link to="/login" className="cta-button">
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;
