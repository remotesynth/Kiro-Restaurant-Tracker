import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { Restaurant } from '../components/restaurants/RestaurantCard';

// Define API URL from environment variables or use a default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Define the shape of the review interface
interface Review {
  reviewId: string;
  text: string;
  createdAt: string;
}

// Define the shape of the restaurant detail interface (extends Restaurant with reviews)
interface RestaurantDetail extends Restaurant {
  reviews: Review[];
}

// Define the shape of the restaurant context
interface RestaurantContextType {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  fetchRestaurants: () => Promise<void>;
  getRestaurant: (id: string) => Promise<RestaurantDetail | null>;
  createRestaurant: (data: {
    name: string;
    location?: string;
    cuisineType?: string;
    description?: string;
  }) => Promise<Restaurant | null>;
  updateRestaurant: (
    id: string,
    data: {
      name?: string;
      location?: string;
      cuisineType?: string;
      description?: string;
      visited?: boolean;
      rating?: number;
    }
  ) => Promise<Restaurant | null>;
  deleteRestaurant: (id: string) => Promise<boolean>;
  addReviewNote: (restaurantId: string, text: string) => Promise<Review | null>;
  updateRating: (
    restaurantId: string,
    rating: number
  ) => Promise<Restaurant | null>;
  clearError: () => void;
}

// Create the restaurant context with default values
const RestaurantContext = createContext<RestaurantContextType>({
  restaurants: [],
  loading: false,
  error: null,
  fetchRestaurants: async () => {},
  getRestaurant: async () => null,
  createRestaurant: async () => null,
  updateRestaurant: async () => null,
  deleteRestaurant: async () => false,
  addReviewNote: async () => null,
  updateRating: async () => null,
  clearError: () => {},
});

// Custom hook to use the restaurant context
export const useRestaurant = () => useContext(RestaurantContext);

interface RestaurantProviderProps {
  children: ReactNode;
}

// Restaurant provider component
export const RestaurantProvider: React.FC<RestaurantProviderProps> = ({
  children,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantCache, setRestaurantCache] = useState<
    Record<string, RestaurantDetail>
  >({});
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { isAuthenticated } = useAuth();

  // Cache expiration time in milliseconds (5 minutes)
  const CACHE_EXPIRATION = 5 * 60 * 1000;

  // Fetch restaurants when the component mounts and the user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check if we need to fetch restaurants (cache expired or first load)
      const now = Date.now();
      if (now - lastFetchTime > CACHE_EXPIRATION || restaurants.length === 0) {
        fetchRestaurants();
      }
    }
  }, [isAuthenticated]);

  // Save restaurants to localStorage when they change
  useEffect(() => {
    if (restaurants.length > 0) {
      localStorage.setItem('restaurantList', JSON.stringify(restaurants));
      localStorage.setItem('restaurantListTimestamp', Date.now().toString());
    }
  }, [restaurants]);

  // Load restaurants from localStorage on initial load
  useEffect(() => {
    const cachedRestaurants = localStorage.getItem('restaurantList');
    const cachedTimestamp = localStorage.getItem('restaurantListTimestamp');

    if (cachedRestaurants && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // Use cached data if it's not expired
      if (now - timestamp <= CACHE_EXPIRATION) {
        setRestaurants(JSON.parse(cachedRestaurants));
        setLastFetchTime(timestamp);
      }
    }

    // Load cached restaurant details
    const restaurantCacheObj: Record<string, RestaurantDetail> = {};

    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      // Check if it's a cached restaurant
      if (key && key.startsWith('restaurant_') && !key.endsWith('_timestamp')) {
        const restaurantId = key.replace('restaurant_', '');
        const timestampKey = `restaurant_${restaurantId}_timestamp`;
        const cachedTimestamp = localStorage.getItem(timestampKey);

        if (cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();

          // Use cached data if it's not expired
          if (now - timestamp <= CACHE_EXPIRATION) {
            try {
              const cachedData = localStorage.getItem(key);
              if (cachedData) {
                restaurantCacheObj[restaurantId] = JSON.parse(cachedData);
              }
            } catch (error) {
              console.warn(
                `Failed to parse cached restaurant ${restaurantId}:`,
                error
              );
            }
          } else {
            // Remove expired cache
            localStorage.removeItem(key);
            localStorage.removeItem(timestampKey);
          }
        }
      }
    }

    // Set the restaurant cache
    setRestaurantCache(restaurantCacheObj);
  }, [CACHE_EXPIRATION]);

  // Function to clear error
  const clearError = () => {
    setError(null);
  };

  // Function to fetch all restaurants
  const fetchRestaurants = async () => {
    if (!isAuthenticated) return;

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
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError('Failed to fetch restaurants. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to get a single restaurant by ID
  const getRestaurant = async (
    id: string
  ): Promise<RestaurantDetail | null> => {
    if (!isAuthenticated) return null;

    // Check if we have a cached version that's not expired
    if (restaurantCache[id]) {
      const cachedTime = new Date(restaurantCache[id].updatedAt).getTime();
      const now = Date.now();

      if (now - cachedTime <= CACHE_EXPIRATION) {
        return restaurantCache[id];
      }
    }

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

        setLoading(false);
        return mockRestaurant;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return null;
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
      const restaurantDetail: RestaurantDetail = {
        ...restaurantData,
        reviews: reviewsData.reviews || [],
      };

      // Cache the restaurant detail
      setRestaurantCache((prevCache) => ({
        ...prevCache,
        [id]: restaurantDetail,
      }));

      // Store in localStorage
      try {
        localStorage.setItem(
          `restaurant_${id}`,
          JSON.stringify(restaurantDetail)
        );
        localStorage.setItem(
          `restaurant_${id}_timestamp`,
          Date.now().toString()
        );
      } catch (storageError) {
        // Handle localStorage errors (e.g., quota exceeded)
        console.warn(
          'Failed to cache restaurant in localStorage:',
          storageError
        );
      }

      return restaurantDetail;
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setError('Failed to fetch restaurant details. Please try again later.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new restaurant
  const createRestaurant = async (data: {
    name: string;
    location?: string;
    cuisineType?: string;
    description?: string;
  }): Promise<Restaurant | null> => {
    if (!isAuthenticated) return null;

    setLoading(true);
    setError(null);

    try {
      // For development mode, simulate successful creation
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Mock data for development
        const mockRestaurant: Restaurant = {
          restaurantId: Math.random().toString(36).substring(2, 15),
          name: data.name,
          location: data.location,
          cuisineType: data.cuisineType,
          description: data.description,
          visited: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Add to local state
        setRestaurants((prevRestaurants) => [
          ...prevRestaurants,
          mockRestaurant,
        ]);

        setLoading(false);
        return mockRestaurant;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return null;
      }

      // Create restaurant via API
      const response = await fetch(`${API_URL}/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create restaurant');
      }

      const newRestaurant = await response.json();

      // Add to local state
      setRestaurants((prevRestaurants) => [...prevRestaurants, newRestaurant]);

      return newRestaurant;
    } catch (error) {
      console.error('Error creating restaurant:', error);
      setError('Failed to create restaurant. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to update a restaurant
  const updateRestaurant = async (
    id: string,
    data: {
      name?: string;
      location?: string;
      cuisineType?: string;
      description?: string;
      visited?: boolean;
      rating?: number;
    }
  ): Promise<Restaurant | null> => {
    if (!isAuthenticated) return null;

    setLoading(true);
    setError(null);

    try {
      // For development mode, simulate successful update
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Find the restaurant in local state
        const restaurantIndex = restaurants.findIndex(
          (r) => r.restaurantId === id
        );

        if (restaurantIndex === -1) {
          throw new Error('Restaurant not found');
        }

        // Create updated restaurant
        const updatedRestaurant: Restaurant = {
          ...restaurants[restaurantIndex],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        // Update local state
        const updatedRestaurants = [...restaurants];
        updatedRestaurants[restaurantIndex] = updatedRestaurant;
        setRestaurants(updatedRestaurants);

        setLoading(false);
        return updatedRestaurant;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return null;
      }

      // Update restaurant via API
      const response = await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update restaurant');
      }

      const updatedRestaurant = await response.json();

      // Update local state
      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((restaurant) =>
          restaurant.restaurantId === id ? updatedRestaurant : restaurant
        )
      );

      return updatedRestaurant;
    } catch (error) {
      console.error('Error updating restaurant:', error);
      setError('Failed to update restaurant. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to delete a restaurant
  const deleteRestaurant = async (id: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    setLoading(true);
    setError(null);

    try {
      // For development mode, simulate successful deletion
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Remove from local state
        setRestaurants((prevRestaurants) =>
          prevRestaurants.filter((restaurant) => restaurant.restaurantId !== id)
        );

        setLoading(false);
        return true;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return false;
      }

      // Delete restaurant via API
      const response = await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete restaurant');
      }

      // Remove from local state
      setRestaurants((prevRestaurants) =>
        prevRestaurants.filter((restaurant) => restaurant.restaurantId !== id)
      );

      return true;
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setError('Failed to delete restaurant. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to add a review note
  const addReviewNote = async (
    restaurantId: string,
    text: string
  ): Promise<Review | null> => {
    if (!isAuthenticated) return null;

    setLoading(true);
    setError(null);

    try {
      // For development mode, simulate successful review addition
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Mock review data
        const mockReview: Review = {
          reviewId: Math.random().toString(36).substring(2, 15),
          text,
          createdAt: new Date().toISOString(),
        };

        // Update the restaurant's visited status in local state
        setRestaurants((prevRestaurants) =>
          prevRestaurants.map((restaurant) =>
            restaurant.restaurantId === restaurantId
              ? { ...restaurant, visited: true }
              : restaurant
          )
        );

        setLoading(false);
        return mockReview;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return null;
      }

      // Add review note via API
      const response = await fetch(
        `${API_URL}/restaurants/${restaurantId}/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add review note');
      }

      const newReview = await response.json();

      // Update the restaurant's visited status in local state
      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((restaurant) =>
          restaurant.restaurantId === restaurantId
            ? { ...restaurant, visited: true }
            : restaurant
        )
      );

      return newReview;
    } catch (error) {
      console.error('Error adding review note:', error);
      setError('Failed to add review note. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to update a restaurant's rating
  const updateRating = async (
    restaurantId: string,
    rating: number
  ): Promise<Restaurant | null> => {
    if (!isAuthenticated) return null;

    setLoading(true);
    setError(null);

    try {
      // For development mode, simulate successful rating update
      if (
        process.env.NODE_ENV === 'development' &&
        !API_URL.includes('localhost')
      ) {
        // Find the restaurant in local state
        const restaurantIndex = restaurants.findIndex(
          (r) => r.restaurantId === restaurantId
        );

        if (restaurantIndex === -1) {
          throw new Error('Restaurant not found');
        }

        // Create updated restaurant
        const updatedRestaurant: Restaurant = {
          ...restaurants[restaurantIndex],
          visited: true,
          rating,
          updatedAt: new Date().toISOString(),
        };

        // Update local state
        const updatedRestaurants = [...restaurants];
        updatedRestaurants[restaurantIndex] = updatedRestaurant;
        setRestaurants(updatedRestaurants);

        setLoading(false);
        return updatedRestaurant;
      }

      // Get the auth token from local storage
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return null;
      }

      // Update rating via API
      const response = await fetch(
        `${API_URL}/restaurants/${restaurantId}/rating`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update rating');
      }

      const updatedRestaurant = await response.json();

      // Update local state
      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((restaurant) =>
          restaurant.restaurantId === restaurantId
            ? updatedRestaurant
            : restaurant
        )
      );

      return updatedRestaurant;
    } catch (error) {
      console.error('Error updating rating:', error);
      setError('Failed to update rating. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Provide the restaurant context to children components
  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        loading,
        error,
        fetchRestaurants,
        getRestaurant,
        createRestaurant,
        updateRestaurant,
        deleteRestaurant,
        addReviewNote,
        updateRating,
        clearError,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export default RestaurantProvider;
