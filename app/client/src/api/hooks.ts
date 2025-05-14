import { useState, useMemo, useEffect } from 'react';
import { UseDeferredFetchApiReturn, UseFetchApiReturn } from './types';



export function useFetch<T>(url: string): UseFetchApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const memoizedUrl = useMemo(() => url, [url]);

  useEffect(() => {
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

  return { data, loading, error };
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

