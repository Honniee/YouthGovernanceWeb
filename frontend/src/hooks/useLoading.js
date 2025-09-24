import { useState, useEffect } from 'react';

const useLoading = (minimumLoadTime = 2000) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minimumLoadTime);

    // You can add real loading logic here, such as:
    // - Fetching initial data
    // - Loading fonts
    // - Checking authentication
    // - Preloading images

    return () => clearTimeout(timer);
  }, [minimumLoadTime]);

  return isLoading;
};

export default useLoading; 