'use client'
import { useState, useRef, useEffect } from 'react';
import { useMapTilerGeocoding } from '@/hooks/useMapTilerGeocoding';

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Search for a location...'
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
  const { places, isLoading, searchPlaces } = useMapTilerGeocoding(mapTilerKey);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search for places when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchPlaces(searchQuery);
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchPlaces]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handlePlaceSelect = (place: { place_name: string; center: [number, number] }) => {
    setSearchQuery(place.place_name);
    onChange(place.place_name);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${className}`}
        onFocus={() => {
          if (places.length > 0) {
            setIsDropdownOpen(true);
          }
        }}
      />
      
      {isDropdownOpen && (places.length > 0 || isLoading) && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-2 text-gray-500 dark:text-gray-400">Searching...</div>
          ) : (
            places.map((place, index) => (
              <div
                key={index}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => handlePlaceSelect(place)}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {place.place_name}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};