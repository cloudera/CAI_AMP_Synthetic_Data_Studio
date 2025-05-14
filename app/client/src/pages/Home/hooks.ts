import { notification } from 'antd';
import isEmpty from 'lodash/isEmpty';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';


const BASE_API_URL = import.meta.env.VITE_AMP_URL;

const fetchDatasets = async () => {
  const dataset_resp = await fetch(`${BASE_API_URL}/generations/history`, {
    method: 'GET',
  });
  const datasets = await dataset_resp.json();
  
  return {
    datasets
  };
};

const fetchEvaluations = async () => {
    const evaluations_resp = await fetch(`${BASE_API_URL}/evaluations/history`, {
      method: 'GET',
    });
    const evaluations = await evaluations_resp.json();
    
    return {
        evaluations
    };
};

export const useDatasets = () => {
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const { data, isLoading, isError, refetch } = useQuery(
        {
         queryKey: ["fetchDatasets", fetchDatasets],
        queryFn: () => fetchDatasets(),
        refetchInterval: 15000
      }
    );
    if (searchQuery !== null && !isEmpty(searchQuery))  {
        const filteredData = data?.datasets.filter((dataset: unknown) => {
            return dataset.display_name.toLowerCase().includes(searchQuery.toLowerCase());
        });
        
        return {
            data: { datasets: filteredData },
            isLoading,
            isError,
            refetch,
            searchQuery,
            setSearchQuery
        };
    }
    return {
      data,
      isLoading,
      isError,
      refetch,
      searchQuery,
      setSearchQuery   
    };
}

export const useEvaluations = () => {
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const { data, isLoading, isError, refetch } = useQuery(
        {
          queryKey: ["fetchEvaluations", fetchEvaluations],
          queryFn: () => fetchEvaluations(),
          refetchInterval: 15000
        }
    );
    if (searchQuery !== null && !isEmpty(searchQuery))  {
        const filteredData = data?.evaluations.filter((evaluation: unknown) => {
            return evaluation.display_name.toLowerCase().includes(searchQuery.toLowerCase());
        });
        
        return {
            data: { evaluations: filteredData },
            isLoading,
            isError,
            refetch,
            searchQuery,
            setSearchQuery
        };
    }
    return {
      data,
      isLoading,
      isError,
      refetch,
      searchQuery,
      setSearchQuery   
    };
}

const fetchUpgradeStatus = async () => {
    const upgrade_resp = await fetch(`${BASE_API_URL}/synthesis-studio/check-upgrade`, {
      method: 'GET',
    });
    const upgradeStatus = await upgrade_resp.json();
    return upgradeStatus;
}

export const useUpgradeStatus = () => {
  const { data, isLoading, isError, refetch } = useQuery(
    {
      queryKey: ["fetchUpgradeStatus", fetchUpgradeStatus],
      queryFn: () => fetchUpgradeStatus(),
      refetchInterval: 60000
    }
  );

  return {
    data,
    isLoading,
    isError,
    refetch
  };
}

const upgradeSynthesisStudio = async () => {
  const upgrade_resp = await fetch(`${BASE_API_URL}/synthesis-studio/upgrade`, {
    method: 'POST',
  });
  const body = await upgrade_resp.json();
  return body;
};

export const useUpgradeSynthesisStudio = () => {
  const mutation = useMutation({
    mutationFn: upgradeSynthesisStudio
  });

  if (mutation.isError) {
    notification.error({
      message: 'Error',
      description: `An error occurred while starting the upgrade action.\n`
    });
  }

  return {
    upgradeStudio: mutation.mutate,
    fetching: mutation.isLoading,
    error: mutation.error,
    isError: mutation.isError,
    data: mutation.data
  };
}
