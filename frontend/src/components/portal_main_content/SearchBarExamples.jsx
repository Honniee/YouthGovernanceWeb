import React from 'react';
import { SearchBar, useSearch } from './index';

/**
 * Examples of how to use the SearchBar component
 * This file demonstrates various use cases and configurations
 */

// Example 1: Staff Management Search (matches current StaffManagement)
export const StaffSearchBar = ({ onSearch, initialValue = '' }) => {
  const { query, handleSearch, handleClear } = useSearch({
    initialValue,
    debounceMs: 300,
    onSearch,
    minLength: 1
  });

  return (
    <SearchBar
      value={query}
      onChange={handleSearch}
      onClear={handleClear}
      placeholder="Search staff members..."
      expandOnMobile={true}
      showIndicator={true}
      indicatorText="Search"
      indicatorColor="orange"
      size="md"
      autoFocus={true}
    />
  );
};

// Example 2: Compact search for smaller spaces
export const CompactSearchBar = ({ onSearch }) => {
  const { query, handleSearch, handleClear } = useSearch({
    debounceMs: 200,
    onSearch,
    minLength: 2
  });

  return (
    <SearchBar
      value={query}
      onChange={handleSearch}
      onClear={handleClear}
      placeholder="Quick search..."
      expandOnMobile={false}
      showIndicator={false}
      size="sm"
      variant="minimal"
    />
  );
};

// Example 3: Large search for main pages
export const HeroSearchBar = ({ onSearch, placeholder = "Search everything..." }) => {
  const { query, handleSearch, handleClear, isSearching } = useSearch({
    debounceMs: 500,
    onSearch,
    minLength: 3
  });

  return (
    <SearchBar
      value={query}
      onChange={handleSearch}
      onClear={handleClear}
      placeholder={placeholder}
      expandOnMobile={false}
      showIndicator={true}
      indicatorText={isSearching ? "Searching..." : "Search"}
      indicatorColor="blue"
      size="lg"
      variant="outlined"
    />
  );
};

// Example 4: Search with custom indicator colors
export const ColoredSearchBars = ({ onSearch }) => {
  const userSearch = useSearch({ onSearch, debounceMs: 300 });
  const reportSearch = useSearch({ onSearch, debounceMs: 300 });
  const activitySearch = useSearch({ onSearch, debounceMs: 300 });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">User Search</label>
        <SearchBar
          value={userSearch.query}
          onChange={userSearch.handleSearch}
          onClear={userSearch.handleClear}
          placeholder="Search users..."
          indicatorColor="blue"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Search</label>
        <SearchBar
          value={reportSearch.query}
          onChange={reportSearch.handleSearch}
          onClear={reportSearch.handleClear}
          placeholder="Search reports..."
          indicatorColor="green"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Activity Search</label>
        <SearchBar
          value={activitySearch.query}
          onChange={activitySearch.handleSearch}
          onClear={activitySearch.handleClear}
          placeholder="Search activities..."
          indicatorColor="purple"
        />
      </div>
    </div>
  );
};

// Example 5: Search with instant results (no debouncing)
export const InstantSearchBar = ({ onSearch, results = [] }) => {
  const { query, handleSearch, handleClear } = useSearch({
    debounceMs: 0, // No debouncing
    onSearch,
    minLength: 1
  });

  return (
    <div className="relative">
      <SearchBar
        value={query}
        onChange={handleSearch}
        onClear={handleClear}
        placeholder="Type to search instantly..."
        expandOnMobile={false}
        showIndicator={true}
        indicatorText="Live"
        indicatorColor="green"
      />
      
      {/* Instant results dropdown */}
      {query && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              {result.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Example 6: Search with history suggestions
export const SearchWithHistory = ({ onSearch }) => {
  const { 
    query, 
    handleSearch, 
    handleClear, 
    searchHistory, 
    suggestions,
    handleSubmit 
  } = useSearch({
    debounceMs: 300,
    onSearch,
    maxHistory: 10
  });

  return (
    <div className="relative">
      <SearchBar
        value={query}
        onChange={handleSearch}
        onClear={handleClear}
        placeholder="Search with history..."
        expandOnMobile={false}
        showIndicator={true}
      />
      
      {/* Search suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 text-xs text-gray-500 border-b border-gray-100">Recent searches</div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                handleSearch(suggestion);
                handleSubmit();
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Example 7: Disabled search state
export const DisabledSearchBar = ({ reason = "Search is currently unavailable" }) => {
  return (
    <SearchBar
      value=""
      onChange={() => {}}
      placeholder="Search disabled..."
      disabled={true}
      showIndicator={false}
      title={reason}
    />
  );
};

// Example 8: Different variants showcase
export const SearchVariantsShowcase = ({ onSearch }) => {
  const defaultSearch = useSearch({ onSearch });
  const minimalSearch = useSearch({ onSearch });
  const outlinedSearch = useSearch({ onSearch });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Default Variant</h3>
        <SearchBar
          value={defaultSearch.query}
          onChange={defaultSearch.handleSearch}
          onClear={defaultSearch.handleClear}
          placeholder="Default search..."
          variant="default"
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Minimal Variant</h3>
        <SearchBar
          value={minimalSearch.query}
          onChange={minimalSearch.handleSearch}
          onClear={minimalSearch.handleClear}
          placeholder="Minimal search..."
          variant="minimal"
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Outlined Variant</h3>
        <SearchBar
          value={outlinedSearch.query}
          onChange={outlinedSearch.handleSearch}
          onClear={outlinedSearch.handleClear}
          placeholder="Outlined search..."
          variant="outlined"
        />
      </div>
    </div>
  );
};

export default {
  StaffSearchBar,
  CompactSearchBar,
  HeroSearchBar,
  ColoredSearchBars,
  InstantSearchBar,
  SearchWithHistory,
  DisabledSearchBar,
  SearchVariantsShowcase
};





