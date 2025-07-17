import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Restaurant } from '../../components/restaurants/RestaurantCard';

// Define API URL from environment variables or use a default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const AddReviewPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviewText, setReviewText] = useState<string>('');
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
          description: 'This is a sample restaurant description.',
          visited: false, // Set to false to test the visited toggle
          rating: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setRestaurant(mockRestaurant);
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
      setRestaurant(data);

      // If the restaurant is already visited and has a rating, pre-fill it
      if (data.visited && data.rating !== undefined) {
        setRating(data.rating);
      }
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
    if (!reviewText.trim()) {
      setError('Review text is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For development mode, simulate successful submission
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        console.log('Development mode: Adding review', {
          restaurantId,
          reviewText,
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

      // If the restaurant is not visited or the rating has changed, update the restaurant first
      if (
        restaurant &&
        (!restaurant.visited ||
          (rating !== undefined && rating !== restaurant.rating))
      ) {
        const updateResponse = await fetch(
          `${API_URL}/restaurants/${restaurantId}/rating`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              rating: rating || 0, // Default to 0 if no rating is provided
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(
            errorData.message || 'Failed to update restaurant rating'
          );
        }
      }

      // Add the review note
      const reviewResponse = await fetch(
        `${API_URL}/restaurants/${restaurantId}/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: reviewText,
          }),
        }
      );

      if (!reviewResponse.ok) {
        const errorData = await reviewResponse.json();
        throw new Error(errorData.message || 'Failed to add review note');
      }

      // Redirect to restaurant detail page on success
      navigate(`/restaurants/${restaurantId}`);
    } catch (error) {
      console.error('Error adding review:', error);
      setError('Failed to add review. Please try again.');
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
      <div className="add-review-page">
        <div className="loading">Loading restaurant details...</div>
      </div>
    );
  }

  // Render error state
  if (error && !isSubmitting) {
    return (
      <div className="add-review-page">
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

  // Render not found state
  if (!restaurant) {
    return (
      <div className="add-review-page">
        <div className="error-message">Restaurant not found</div>
        <button
          onClick={() => navigate('/restaurants')}
          className="back-button"
        >
          Back to Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="add-review-page">
      <h1>
        {restaurant.visited ? 'Add Review Note' : 'Mark as Visited & Review'}
      </h1>
      <h2>{restaurant.name}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="review-form">
        {!restaurant.visited && (
          <div className="form-group">
            <p className="info-message">
              This restaurant will be marked as visited when you submit your
              review.
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="rating">Rating</label>
          {renderStarRatingInput()}
        </div>

        <div className="form-group">
          <label htmlFor="reviewText">
            Review Note <span className="required">*</span>
          </label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience at this restaurant..."
            rows={6}
            required
            disabled={isSubmitting}
          />
        </div>

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
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddReviewPage;
