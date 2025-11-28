import { useState, useCallback } from 'react';

interface MapTilerPlace {
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
}

interface MapTilerResponse {
  features: MapTilerPlace[];
}

export const useMapTilerGeocoding = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<MapTilerPlace[]>([]);

  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPlaces([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${apiKey}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch places');
      }

      const data: MapTilerResponse = await response.json();
      setPlaces(data.features || []);
    } catch (error) {
      console.error('MapTiler geocoding error:', error);
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  return {
    places,
    isLoading,
    searchPlaces,
  };
};