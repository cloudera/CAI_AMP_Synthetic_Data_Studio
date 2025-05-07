import { useQuery } from "@tanstack/react-query";
import { ExportResponse, PaginatedExportsResponse } from "./response";

const BASE_API_URL = import.meta.env.VITE_AMP_URL;
const REFETCHINTERVAL_IN_MS = 10000;

export const API_ENDPOINTS = {
    getExports: `${BASE_API_URL}/exports/history`,
};

async function getExportJobs(page = 1, pageSize = 10): Promise<PaginatedExportsResponse> {
    let response;

    try {
        response = await fetch(`${API_ENDPOINTS.getExports}?page=${page}&page_size=${pageSize}`);

        if (!response.ok) {
            return Promise.reject(response.statusText);
        }
    } catch (error) {
        return Promise.reject(error);
    }

    const exportResponse = await response.json();
    return exportResponse;
};

const useGetExportJobs = (page = 1, pageSize = 10) => {
    return useQuery<PaginatedExportsResponse>({ 
        queryKey: [`${API_ENDPOINTS.getExports}`, page, pageSize], 
        queryFn: () => getExportJobs(page, pageSize),
        refetchIntervalInBackground: true, 
        refetchInterval: REFETCHINTERVAL_IN_MS 
    });
};

export { useGetExportJobs };