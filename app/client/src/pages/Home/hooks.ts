import { notification } from 'antd';
import isEmpty from 'lodash/isEmpty';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DatasetResponse } from '../api/Datasets/response';
import { EvaluationResponse } from '../api/Evaluations/response';
import { ExportResponse } from '../api/Export/response';
import { PaginatedResponse } from '../api/common/pagination';

const BASE_API_URL = import.meta.env.VITE_AMP_URL;

// Updated to use pagination
const fetchDatasets = async (page = 1, pageSize = 10) => {
  const dataset_resp = await fetch(`${BASE_API_URL}/generations/history?page=${page}&page_size=${pageSize}`, {
    method: 'GET',
  });
  return await dataset_resp.json();
};

// Updated to use pagination
const fetchEvaluations = async (page = 1, pageSize = 10) => {
  const evaluations_resp = await fetch(`${BASE_API_URL}/evaluations/history?page=${page}&page_size=${pageSize}`, {
    method: 'GET',
  });
  return await evaluations_resp.json();
};

// Updated to use pagination
const fetchExports = async (page = 1, pageSize = 10) => {
  const exports_resp = await fetch(`${BASE_API_URL}/exports/history?page=${page}&page_size=${pageSize}`, {
    method: 'GET',
  });
  return await exports_resp.json();
};

export const useDatasets = () => {
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 5 });
  
  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<DatasetResponse>>(
    {
      queryKey: ["fetchDatasets", pagination.page, pagination.pageSize],
      queryFn: () => fetchDatasets(pagination.page, pagination.pageSize),
      refetchInterval: 15000
    }
  );
  
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination({ 
      page, 
      pageSize: pageSize || pagination.pageSize 
    });
  };
  
  let filteredData = data;
  
  if (searchQuery !== null && !isEmpty(searchQuery) && data?.data) {
    // If searching, we filter locally from the current page
    const filtered = data.data.filter((dataset: DatasetResponse) => {
      return dataset.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    filteredData = {
      ...data,
      data: filtered,
    };
  }
  if (filteredData && filteredData.data.length !== 0 && filteredData.data.length > 5) {
    filteredData.data = filteredData.data.slice(0, 5);
  }
  
  return {
    data: filteredData,
    isLoading,
    isError,
    refetch,
    searchQuery,
    setSearchQuery,
    pagination: {
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: data?.pagination?.total || 0,
      onChange: handlePageChange,
      showSizeChanger: true,
      showQuickJumper: true
    }
  };
};

export const useEvaluations = () => {
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  
  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<EvaluationResponse>>(
    {
      queryKey: ["fetchEvaluations", pagination.page, pagination.pageSize],
      queryFn: () => fetchEvaluations(pagination.page, pagination.pageSize),
      refetchInterval: 15000
    }
  );
  
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination({ 
      page, 
      pageSize: pageSize || pagination.pageSize 
    });
  };
  
  let filteredData = data;
  
  if (searchQuery !== null && !isEmpty(searchQuery) && data?.data) {
    // If searching, we filter locally from the current page
    const filtered = data.data.filter((evaluation: EvaluationResponse) => {
      return evaluation.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    filteredData = {
      ...data,
      data: filtered,
    };
  }

  if (filteredData && filteredData.data.length !== 0 && filteredData.data.length > 5) {
    filteredData.data = filteredData.data.slice(0, 5);
  }
  
  return {
    data: filteredData,
    isLoading,
    isError,
    refetch,
    searchQuery,
    setSearchQuery,
    pagination: {
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: data?.pagination?.total || 0,
      onChange: handlePageChange,
      showSizeChanger: true,
      showQuickJumper: true
    }
  };
};


export const useExports = () => {
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  
  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<ExportResponse>>(
    {
      queryKey: ["fetchExports", pagination.page, pagination.pageSize],
      queryFn: () => fetchExports(pagination.page, pagination.pageSize),
      refetchInterval: 15000

    }
  );
  
  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination({ 
      page, 
      pageSize: pageSize || pagination.pageSize 
    });
  };
  
  let filteredData = data;
  
  if (searchQuery !== null && !isEmpty(searchQuery) && data?.data) {
    // If searching, we filter locally from the current page
    const filtered = data.data.filter((exportItem: ExportResponse) => {
      return exportItem.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    filteredData = {
      ...data,
      data: filtered,
    };

  }

  if (filteredData && filteredData.data.length !== 0 && filteredData.data.length > 5) {
    filteredData.data = filteredData.data.slice(0, 5);
  }
  
  return {
    data: filteredData,
    isLoading,
    isError,
    refetch,
    searchQuery,
    setSearchQuery,
    pagination: {
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: data?.pagination?.total || 0,
      onChange: handlePageChange,
      showSizeChanger: true,
      showQuickJumper: true
    }
  };
};

// Rest of your hooks remain unchanged
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
      refetchInterval: 10 * 60000
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
