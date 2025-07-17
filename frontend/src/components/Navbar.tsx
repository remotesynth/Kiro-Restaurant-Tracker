import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Restaurant Tracker</Link>
      </div>
      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <Link to="/restaurants" className="navbar-item">
              My Restaurants
            </Link>
            <div className="navbar-item">
              <span className="user-email">{user?.email}</span>
              <button onClick={logout} className="logout-button">
                Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="navbar-item">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
