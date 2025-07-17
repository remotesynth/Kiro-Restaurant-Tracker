import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantCard, {
  Restaurant,
} from '../../components/restaurants/RestaurantCard';

// Define cuisine types
const CUISINE_TYPES = [
  'All',
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

// Define API URL from environment variables or use a default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const RestaurantListPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const [displayedRestaurants, setDisplayedRestaurants] = useState<
    Restaurant[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState<string>('All');
  const [visitedFilter, setVisitedFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();

  // Number of restaurants per page
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    // Only fetch restaurants if the user is authenticated
    if (isAuthenticated) {
      fetchRestaurants();
    }
  }, [isAuthenticated]);

  // Apply filters whenever restaurants, filters, or search term changes
  useEffect(() => {
    if (restaurants.length > 0) {
      applyFilters();
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [restaurants, cuisineFilter, visitedFilter, searchTerm]);

  // Update displayed restaurants when filtered restaurants or current page changes
  useEffect(() => {
    updateDisplayedRestaurants();
  }, [filteredRestaurants, currentPage]);

  // Function to apply filters and search
  const applyFilters = () => {
    let result = [...restaurants];

    // Apply cuisine filter
    if (cuisineFilter !== 'All') {
      result = result.filter(
        (restaurant) => restaurant.cuisineType === cuisineFilter
      );
    }

    // Apply visited filter
    if (visitedFilter !== 'All') {
      const isVisited = visitedFilter === 'Visited';
      result = result.filter((restaurant) => restaurant.visited === isVisited);
    }

    // Apply search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(term) ||
          (restaurant.location &&
            restaurant.location.toLowerCase().includes(term)) ||
          (restaurant.description &&
            restaurant.description.toLowerCase().includes(term))
      );
    }

    setFilteredRestaurants(result);
    setHasMore(result.length > ITEMS_PER_PAGE);
  };

  // Function to update displayed restaurants based on pagination
  const updateDisplayedRestaurants = () => {
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    const displayed = filteredRestaurants.slice(startIndex, endIndex);
    setDisplayedRestaurants(displayed);
    setHasMore(endIndex < filteredRestaurants.length);
  };

  // Function to load more restaurants
  const loadMoreRestaurants = () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    setCurrentPage((prevPage) => prevPage + 1);
    setLoadingMore(false);
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    setError(null);

    try {
      // For development mode, use mock data if API_URL is not set
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Mock data for development
        const mockRestaurants: Restaurant[] = [
          {
            restaurantId: '1',
            name: 'Italian Delight',
            location: 'Downtown',
            cuisineType: 'Italian',
            description: 'Authentic Italian cuisine',
            visited: true,
            rating: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            restaurantId: '2',
            name: 'Sushi Heaven',
            location: 'Midtown',
            cuisineType: 'Japanese',
            description: 'Fresh sushi and sashimi',
            visited: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            restaurantId: '3',
            name: 'Taco Town',
            location: 'Uptown',
            cuisineType: 'Mexican',
            description: 'Best tacos in town',
            visited: true,
            rating: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        setRestaurants(mockRestaurants);
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

      // Fetch restaurants from the API
      const response = await fetch(`${API_URL}/restaurants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch restaurants: ${response.statusText}`);
      }

      const data = await response.json();
      setRestaurants(data.restaurants || []);
      setFilteredRestaurants(data.restaurants || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError('Failed to fetch restaurants. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="restaurant-list-page">
        <div className="page-header">
          <h1>My Restaurants</h1>
          <Link to="/restaurants/new" className="add-button">
            Add Restaurant
          </Link>
        </div>
        <div className="loading">Loading restaurants...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="restaurant-list-page">
        <div className="page-header">
          <h1>My Restaurants</h1>
          <Link to="/restaurants/new" className="add-button">
            Add Restaurant
          </Link>
        </div>
        <div className="error-message">{error}</div>
        <button onClick={fetchRestaurants} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  // Render empty state
  if (restaurants.length === 0) {
    return (
      <div className="restaurant-list-page">
        <div className="page-header">
          <h1>My Restaurants</h1>
          <Link to="/restaurants/new" className="add-button">
            Add Restaurant
          </Link>
        </div>
        <div className="empty-state">
          <p>You haven't added any restaurants yet.</p>
          <Link to="/restaurants/new" className="cta-button">
            Add Your First Restaurant
          </Link>
        </div>
      </div>
    );
  }

  // Render restaurant list
  return (
    <div className="restaurant-list-page">
      <div className="page-header">
        <h1>My Restaurants</h1>
        <Link to="/restaurants/new" className="add-button">
          Add Restaurant
        </Link>
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="cuisine-filter">Cuisine:</label>
          <select
            id="cuisine-filter"
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            className="filter-select"
          >
            {CUISINE_TYPES.map((cuisine) => (
              <option key={cuisine} value={cuisine}>
                {cuisine}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="visited-filter">Status:</label>
          <select
            id="visited-filter"
            value={visitedFilter}
            onChange={(e) => setVisitedFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="Visited">Visited</option>
            <option value="Not Visited">Not Visited</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label htmlFor="search">Search:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search restaurants..."
            className="search-input"
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {filteredRestaurants.length === 0 && !loading && !error && (
        <div className="empty-state">
          <p>No restaurants match your filters.</p>
          <button
            onClick={() => {
              setCuisineFilter('All');
              setVisitedFilter('All');
              setSearchTerm('');
            }}
            className="reset-filters-button"
          >
            Reset Filters
          </button>
        </div>
      )}

      <div className="restaurant-grid">
        {displayedRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.restaurantId}
            restaurant={restaurant}
          />
        ))}
      </div>

      {hasMore && (
        <div className="pagination-container">
          <button
            className="load-more-button"
            onClick={loadMoreRestaurants}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RestaurantListPage;
