import React from 'react';
import { Link } from 'react-router-dom';
import './RestaurantCard.css';

// Define the restaurant interface
export interface Restaurant {
  restaurantId: string;
  name: string;
  location?: string;
  cuisineType?: string;
  description?: string;
  visited: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
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

  return (
    <div className="restaurant-card">
      <Link
        to={`/restaurants/${restaurant.restaurantId}`}
        className="restaurant-card-link"
      >
        <div className="restaurant-card-header">
          <h3 className="restaurant-name">{restaurant.name}</h3>
          <div className="restaurant-status">
            {restaurant.visited ? (
              <span className="status visited">Visited</span>
            ) : (
              <span className="status not-visited">Not Visited</span>
            )}
          </div>
        </div>

        <div className="restaurant-card-body">
          {restaurant.location && (
            <div className="restaurant-location">
              <strong>Location:</strong> {restaurant.location}
            </div>
          )}

          {restaurant.cuisineType && (
            <div className="restaurant-cuisine">
              <strong>Cuisine:</strong> {restaurant.cuisineType}
            </div>
          )}

          {restaurant.visited && (
            <div className="restaurant-rating">
              <strong>Rating:</strong> {renderStars(restaurant.rating)}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default RestaurantCard;
