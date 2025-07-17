import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Restaurant } from '../../components/restaurants/RestaurantCard';

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

const EditRestaurantPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [cuisineType, setCuisineType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [visited, setVisited] = useState<boolean>(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch restaurant if the user is authenticated and we have a restaurant ID
    if (isAuthenticated && restaurantId) {
      fetchRestaurant(restaurantId);
    }
  }, [isAuthenticated, restaurantId]);

  const fetchRestaurant = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // For development mode, use mock data if API_URL is not set
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Mock data for development
        const mockRestaurant: Restaurant = {
          restaurantId: id,
          name: 'Sample Restaurant',
          location: 'Sample Location',
          cuisineType: 'Italian',
          description:
            'This is a sample restaurant description. It includes details about the restaurant, its ambiance, and what makes it special.',
          visited: true,
          rating: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Set form values from mock data
        setName(mockRestaurant.name);
        setLocation(mockRestaurant.location || '');
        setCuisineType(mockRestaurant.cuisineType || '');
        setDescription(mockRestaurant.description || '');
        setVisited(mockRestaurant.visited);
        setRating(mockRestaurant.rating);
        setLoading(false);
        return;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      // Fetch restaurant from the API
      const response = await fetch(`${API_URL}/restaurants/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch restaurant: ${response.statusText}`);
      }

      const data = await response.json();

      // Set form values from API data
      setName(data.name);
      setLocation(data.location || '');
      setCuisineType(data.cuisineType || '');
      setDescription(data.description || '');
      setVisited(data.visited);
      setRating(data.rating);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setError('Failed to fetch restaurant details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
      // For development mode, simulate successful update
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        console.log('Development mode: Updating restaurant', {
          name,
          location,
          cuisineType,
          description,
          visited,
          rating,
        });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Redirect to restaurant detail page
        navigate(`/restaurants/${restaurantId}`);
        return;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setIsSubmitting(false);
        return;
      }

      // Update restaurant via API
      const response = await fetch(`${API_URL}/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          location: location || undefined,
          cuisineType: cuisineType || undefined,
          description: description || undefined,
          visited,
          rating: rating !== undefined ? rating : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update restaurant');
      }

      // Redirect to restaurant detail page on success
      navigate(`/restaurants/${restaurantId}`);
    } catch (error) {
      console.error('Error updating restaurant:', error);
      setError('Failed to update restaurant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to render star rating input
  const renderStarRatingInput = () => {
    return (
      <div className="star-rating-input">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-button ${
              rating !== undefined && star <= rating ? 'filled' : ''
            }`}
            onClick={() => setRating(star)}
            disabled={isSubmitting}
            aria-label={`Rate ${star} stars`}
          >
            {rating !== undefined && star <= rating ? '★' : '☆'}
          </button>
        ))}
        {rating !== undefined && (
          <button
            type="button"
            className="clear-rating"
            onClick={() => setRating(undefined)}
            disabled={isSubmitting}
            aria-label="Clear rating"
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="edit-restaurant-page">
        <div className="loading">Loading restaurant details...</div>
      </div>
    );
  }

  // Render error state
  if (error && !isSubmitting) {
    return (
      <div className="edit-restaurant-page">
        <div className="error-message">{error}</div>
        <button
          onClick={() => navigate(`/restaurants/${restaurantId}`)}
          className="back-button"
        >
          Back to Restaurant
        </button>
      </div>
    );
  }

  return (
    <div className="edit-restaurant-page">
      <h1>Edit Restaurant</h1>

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

        <div className="form-group visited-checkbox">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={visited}
              onChange={(e) => setVisited(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>I have visited this restaurant</span>
          </label>
        </div>

        {visited && (
          <div className="form-group">
            <label>Rating</label>
            {renderStarRatingInput()}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(`/restaurants/${restaurantId}`)}
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditRestaurantPage;
