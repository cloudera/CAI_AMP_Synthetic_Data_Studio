import { useQuery } from "@tanstack/react-query";
import { CustomModel } from "./SettingsPage";

const BASE_API_URL = import.meta.env.VITE_AMP_URL;


const fetchFilteredModels = async () => {
    // const model_filtered_resp = await fetch(`${BASE_API_URL}/model/model_id_filter`, {
    const model_filtered_resp = await fetch(`/custom_model_endpoints`, {    
      method: 'GET',
    });
    return await model_filtered_resp.json();
};


export const deleteModelProvider = async ({ model }: { model: CustomModel }) => {
    const delete_resp = await fetch(`/custom_model_endpoints/${model.model_id}/${model.provider_type}`, {    
        method: 'DELETE'
      });
      return await delete_resp.json();
}

export const getModelProvider = async ({ model }: { model: CustomModel }) => {
    const get_model_resp = await fetch(`/custom_model_endpoints/${model.model_id}/${model.provider_type}`, {
        method: 'GET'
    });
    return await get_model_resp.json();
}

export const updateModelProvider = async ({ model }: { model: CustomModel }) => {
    const update_model_resp = await fetch(`/custom_model_endpoints/${model.model_id}/${model.provider_type}`, {    
        method: 'PUT'
      });
      return await update_model_resp.json();
}


export const useModelProviders = () => {
    
    const { data, isLoading, isError, refetch } = useQuery(
      {
        queryKey: ['fetchFilteredModels'],
        queryFn: () => fetchFilteredModels(),
        refetchInterval: 15000
      }
    );

    return {
        data, 
        isLoading, 
        isError, 
        refetch
    };
}

export const addModelProvider = async (params: any) => {
    const model_filtered_resp = await fetch(`/add_model_endpoint`, {    
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    return await model_filtered_resp.json();
}

export const useGetModelProvider = (model: CustomModel) => {
    
    const { data, isLoading, isError, refetch } = useQuery(
      {
        queryKey: ['getModelProvider'],
        queryFn: () => getModelProvider({ model }),
        refetchInterval: 15000
      }
    );

    return {
        data, 
        isLoading, 
        isError, 
        refetch
    };
}