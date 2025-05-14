import { useQuery } from '@tanstack/react-query';
import { notification } from 'antd';

const BASE_API_URL = import.meta.env.VITE_AMP_URL;

const fetchEvaluationDetails = async (evaluate_file_name: string) => {
    const evaluation__resp = await fetch(`${BASE_API_URL}/evaluations/${evaluate_file_name}`, {
      method: 'GET',
    });
    const evaluation = await evaluation__resp.json();

    const dataset__resp = await fetch(`${BASE_API_URL}/generations/${evaluation.generate_file_name}`, {
        method: 'GET',
    });
    const dataset = await dataset__resp.json();

    const evaluation_details__resp = await fetch(`${BASE_API_URL}/dataset_details/${evaluate_file_name}`, {
      method: 'GET',
    });
    const evaluationDetails = await evaluation_details__resp.json();
    
    return {
      dataset,  
      evaluation,
      evaluationDetails
    };
  };
  
  export const useGetEvaluationDetails = (generate_file_name: string) => {
      const { data, isLoading, isError, error } = useQuery({
        queryKey: ['data', fetchEvaluationDetails],
        queryFn: () => fetchEvaluationDetails(generate_file_name),
        placeholderData: (previousData) => previousData
      });
  
      if (error) {
        notification.error({
          message: 'Error',
          description: `An error occurred while fetching the dataset details:\n ${error}`
        });
      }
  
      return {
        data,
        isLoading,
        isError,
        error    
      };
  }