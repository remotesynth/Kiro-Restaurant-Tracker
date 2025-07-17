import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Restaurant } from '../../components/restaurants/RestaurantCard';
import './RestaurantDetail.css';

// Define API URL from environment variables or use a default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Define the review interface
interface Review {
  reviewId: string;
  text: string;
  createdAt: string;
}

// Define the restaurant detail interface (extends Restaurant with reviews)
interface RestaurantDetail extends Restaurant {
  reviews: Review[];
}

const RestaurantDetailPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
        const mockRestaurant: RestaurantDetail = {
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
          reviews: [
            {
              reviewId: '1',
              text: 'Great food and service!',
              createdAt: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000
              ).toISOString(), // 7 days ago
            },
            {
              reviewId: '2',
              text: 'Loved the pasta dishes. Will definitely come back!',
              createdAt: new Date(
                Date.now() - 3 * 24 * 60 * 60 * 1000
              ).toISOString(), // 3 days ago
            },
          ],
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
      const restaurantResponse = await fetch(`${API_URL}/restaurants/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!restaurantResponse.ok) {
        throw new Error(
          `Failed to fetch restaurant: ${restaurantResponse.statusText}`
        );
      }

      const restaurantData = await restaurantResponse.json();

      // Fetch reviews for the restaurant
      const reviewsResponse = await fetch(
        `${API_URL}/restaurants/${id}/reviews`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!reviewsResponse.ok) {
        throw new Error(
          `Failed to fetch reviews: ${reviewsResponse.statusText}`
        );
      }

      const reviewsData = await reviewsResponse.json();

      // Combine restaurant and reviews data
      setRestaurant({
        ...restaurantData,
        reviews: reviewsData.reviews || [],
      });
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setError('Failed to fetch restaurant details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to render star rating
  const renderStars = (rating?: number) => {
    if (rating === undefined || rating === null) {
      return <span className="no-rating">Not rated</span>;
    }

    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(
          <span key={i} className="star filled">
            ★
          </span>
        );
      } else {
        stars.push(
          <span key={i} className="star">
            ☆
          </span>
        );
      }
    }

    return <div className="star-rating">{stars}</div>;
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="restaurant-detail-page">
        <div className="loading">Loading restaurant details...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="restaurant-detail-page">
        <div className="error-message">{error}</div>
        <button
          onClick={() => navigate('/restaurants')}
          className="back-button"
        >
          Back to Restaurants
        </button>
      </div>
    );
  }

  // Render not found state
  if (!restaurant) {
    return (
      <div className="restaurant-detail-page">
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
    <div className="restaurant-detail-page">
      <div className="detail-header">
        <div className="header-content">
          <h1>{restaurant.name}</h1>
          <div className="restaurant-meta">
            {restaurant.location && (
              <div className="meta-item location">
                <span className="meta-label">Location:</span>{' '}
                {restaurant.location}
              </div>
            )}
            {restaurant.cuisineType && (
              <div className="meta-item cuisine">
                <span className="meta-label">Cuisine:</span>{' '}
                {restaurant.cuisineType}
              </div>
            )}
            <div className="meta-item status">
              <span className="meta-label">Status:</span>
              {restaurant.visited ? (
                <span className="status visited">Visited</span>
              ) : (
                <span className="status not-visited">Not Visited</span>
              )}
            </div>
            {restaurant.visited && (
              <div className="meta-item rating">
                <span className="meta-label">Rating:</span>{' '}
                {renderStars(restaurant.rating)}
              </div>
            )}
          </div>
        </div>
        <div className="header-actions">
          <Link
            to={`/restaurants/${restaurantId}/edit`}
            className="edit-button"
          >
            Edit
          </Link>
          <button
            onClick={() => navigate('/restaurants')}
            className="back-button"
          >
            Back to List
          </button>
        </div>
      </div>

      {restaurant.description && (
        <div className="detail-section description-section">
          <h2>Description</h2>
          <p className="restaurant-description">{restaurant.description}</p>
        </div>
      )}

      <div className="detail-section reviews-section">
        <div className="section-header">
          <h2>Reviews</h2>
          <div className="section-actions">
            {!restaurant.visited && (
              <button
                onClick={async () => {
                  try {
                    // For development mode, simulate successful update
                    if (
                      process.env.NODE_ENV === 'development' &&
                      !API_URL.includes('localhost')
                    ) {
                      console.log(
                        'Development mode: Marking restaurant as visited'
                      );
                      setRestaurant({ ...restaurant, visited: true });
                      return;
                    }

                    // Get the auth token from local storage
                    const token = localStorage.getItem('authToken');

                    if (!token) {
                      setError('Authentication token not found');
                      return;
                    }

                    // Update restaurant via API
                    const response = await fetch(
                      `${API_URL}/restaurants/${restaurantId}`,
                      {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          visited: true,
                        }),
                      }
                    );

                    if (!response.ok) {
                      throw new Error('Failed to update visited status');
                    }

                    const updatedRestaurant = await response.json();
                    setRestaurant({
                      ...restaurant,
                      visited: updatedRestaurant.visited,
                    });
                  } catch (error) {
                    console.error('Error updating visited status:', error);
                    setError('Failed to update visited status');
                  }
                }}
                className="mark-visited-button"
              >
                Mark as Visited
              </button>
            )}
            <Link
              to={`/restaurants/${restaurantId}/review`}
              className="add-review-button"
            >
              {restaurant.visited ? 'Add Review Note' : 'Add Review'}
            </Link>
          </div>
        </div>

        {restaurant.visited && restaurant.reviews.length === 0 && (
          <p className="no-reviews">
            No review notes yet. Add your first review note!
          </p>
        )}

        {!restaurant.visited && (
          <p className="not-visited-message">
            Mark this restaurant as visited to add reviews and ratings.
          </p>
        )}

        {restaurant.reviews.length > 0 && (
          <div className="reviews-list">
            {restaurant.reviews.map((review) => (
              <div key={review.reviewId} className="review-item">
                <div className="review-text">{review.text}</div>
                <div className="review-date">
                  {formatDate(review.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetailPage;
