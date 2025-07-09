import { useState, useMemo, useEffect } from 'react';
import { UseDeferredFetchApiReturn, UseFetchApiReturn } from './types';
import { useQuery } from '@tanstack/react-query';

export function useFetch<T>(url: string): UseFetchApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const memoizedUrl = useMemo(() => url, [url]);

  useEffect(() => {
    // Don't make API call if URL is empty (for regeneration scenarios)
    if (!memoizedUrl || memoizedUrl.trim() === '') {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const fetchData = async () => {
      try {
        const response = await fetch(memoizedUrl, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memoizedUrl]);

  // Return false for loading when URL is empty
  return { 
    data, 
    loading: (!memoizedUrl || memoizedUrl.trim() === '') ? false : loading, 
    error 
  };
}

interface UseGetApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  triggerGet: (path?: string, queryParameters?: string) => Promise<void>;
}

export function useGetApi<T>(url: string): UseGetApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const triggerGet = async (path?: string, queryParameters?: string) => {
    setLoading(true);
    setError(null); // Reset error on each request

    let urlWithParameters = url;
    if (path) {
      urlWithParameters = urlWithParameters.concat(`/${path}`);
    }
    if (queryParameters) {
      urlWithParameters = urlWithParameters.concat(`?${queryParameters}`);
    }

    try {
      const response = await fetch(urlWithParameters, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, triggerGet };
}

export function useDeferredFetch<T>(url: string): UseDeferredFetchApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const memoizedUrl = useMemo(() => url, [url]);

  const fetchData = async () => {
    try {
      const response = await fetch(memoizedUrl, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { fetchData, data, loading, error };
}

interface UsePostApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  triggerPost: (body: Record<string, unknown>) => Promise<void>;
}

export function usePostApi<T>(url: string): UsePostApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const triggerPost = async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null); // Reset error on each request

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) {
        console.log('response.ok = ', response.ok);
        console.log('response.status = ', response.status)
        console.log('json.error = ', json.error)
        throw new Error(json.error || `HTTP error! status: ${response.status}`);
      }

      setData(json);
      return json
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, triggerPost };
}

interface UseDeleteApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  triggerDelete: (path?: string, queryParameters?: string) => Promise<void>;
}

export function useDeleteApi<T>(url: string): UseDeleteApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const triggerDelete = async (path?: string, queryParameters?: string) => {
    setLoading(true);
    setError(null);

    try {
      let urlWithParameters = url;
      if (path) {
        urlWithParameters = urlWithParameters.concat(`/${path}`);
      }
      if (queryParameters) {
        urlWithParameters = urlWithParameters.concat(`?${queryParameters}`);
      }

      const response = await fetch(urlWithParameters, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, triggerDelete };
}

// Use case types and enums
export enum UseCaseId {
  CODE_GENERATION = 'code_generation',
  TEXT2SQL = 'text2sql',
  CUSTOM = 'custom',
  LENDING_DATA = 'lending_data',
  CREDIT_CARD_DATA = 'credit_card_data',
  TICKETING_DATASET = 'ticketing_dataset',
}

export interface UseCase {
  id: string;
  name: string;
}

export interface UseCasesResponse {
  usecases: UseCase[];
}

const fetchUseCases = async (): Promise<UseCasesResponse> => {
  const BASE_API_URL = import.meta.env.VITE_AMP_URL;
  const response = await fetch(`${BASE_API_URL}/use-cases`);
  if (!response.ok) {
    throw new Error('Failed to fetch use cases');
  }
  return response.json();
};

export const useUseCases = () => {
  return useQuery<UseCasesResponse>({
    queryKey: ['useCases'],
    queryFn: fetchUseCases,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
};

export const useUseCaseMapping = () => {
  const { data: useCasesData, isLoading, isError, error } = useUseCases();
  
  // Create a lookup map for fast O(1) access
  const useCaseMap = useMemo(() => {
    if (!useCasesData?.usecases) return {};
    
    return (useCasesData as UseCasesResponse).usecases.reduce((acc: Record<string, string>, useCase: UseCase) => {
      acc[useCase.id] = useCase.name;
      return acc;
    }, {} as Record<string, string>);
  }, [useCasesData]);
  
  // Helper function to get use case name with better fallback
  const getUseCaseName = (id: string): string => {
    if (isError) {
      return id || 'N/A';
    }
    
    if (isLoading) {
      return id || 'Loading...';
    }
    
    const name = useCaseMap[id];
    
    // Log missing use cases in development
    if (!name && id && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn(`Missing use case mapping for: ${id}`);
    }
    
    return name || id || 'N/A';
  };
  
  // Get all use cases as array (useful for dropdowns)
  const useCases = useMemo(() => {
    return (useCasesData as UseCasesResponse)?.usecases || [];
  }, [useCasesData]);
  
  return {
    useCaseMap,
    useCases,
    getUseCaseName,
    isLoading,
    isError,
    error
  };
};

// Hook to provide use case options for dropdowns and forms
export const useUseCaseOptions = () => {
  const { useCases, isLoading, isError } = useUseCaseMapping();
  
  // Transform use cases to option format used in dropdowns
  const useCaseOptions = useMemo(() => {
    return useCases.map((useCase: UseCase) => ({
      label: useCase.name,
      value: useCase.id
    }));
  }, [useCases]);
  
  // Helper function to get use case type/name by id (replaces getUsecaseType)
  const getUseCaseType = (id: string): string => {
    const useCase = useCases.find((uc: UseCase) => uc.id === id);
    return useCase?.name || id || 'N/A';
  };
  
  return {
    useCaseOptions,
    getUseCaseType,
    isLoading,
    isError
  };
};

