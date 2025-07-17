import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Define API URL from environment variables or use a default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Define cuisine types
const CUISINE_TYPES = [
  'American',
  'Chinese',
  'French',
  'Greek',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Thai',
  'Vietnamese',
  'Other',
];

const AddRestaurantPage: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [cuisineType, setCuisineType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!name.trim()) {
      setError('Restaurant name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For development mode, simulate successful creation
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        console.log('Development mode: Creating restaurant', {
          name,
          location,
          cuisineType,
          description,
        });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Redirect to restaurant list
        navigate('/restaurants');
        return;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setIsSubmitting(false);
        return;
      }

      // Create restaurant via API
      const response = await fetch(`${API_URL}/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          location: location || undefined,
          cuisineType: cuisineType || undefined,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create restaurant');
      }

      // Redirect to restaurant list on success
      navigate('/restaurants');
    } catch (error) {
      console.error('Error creating restaurant:', error);
      setError('Failed to create restaurant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-restaurant-page">
      <h1>Add New Restaurant</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="restaurant-form">
        <div className="form-group">
          <label htmlFor="name">
            Restaurant Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter restaurant name"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location (optional)"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cuisineType">Cuisine Type</label>
          <select
            id="cuisineType"
            value={cuisineType}
            onChange={(e) => setCuisineType(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select cuisine type (optional)</option>
            {CUISINE_TYPES.map((cuisine) => (
              <option key={cuisine} value={cuisine}>
                {cuisine}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/restaurants')}
            className="cancel-button"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Restaurant'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddRestaurantPage;
