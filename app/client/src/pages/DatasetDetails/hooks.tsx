import get from 'lodash/get';
import { notification } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getHttpStatusCodeVerb } from '../DataGenerator/utils';
import toNumber from 'lodash/toNumber';


const BASE_API_URL = import.meta.env.VITE_AMP_URL;



const fetchDatasetDetails = async (generate_file_name: string) => {
  const dataset_details__resp = await fetch(`${BASE_API_URL}/dataset_details/${generate_file_name}`, {
    method: 'GET',
  });
  const datasetDetails = await dataset_details__resp.json();
  const dataset__resp = await fetch(`${BASE_API_URL}/generations/${generate_file_name}`, {
    method: 'GET',
  });
  const dataset = await dataset__resp.json();
  
  return {
    dataset,
    datasetDetails,
    statusCode: dataset__resp.status
  };
};




export const useGetDatasetDetails = (generate_file_name: string) => {
    const { data, isLoading, isError, error } = useQuery(
        {
          queryKey: ['data', fetchDatasetDetails],
          queryFn: () => fetchDatasetDetails(generate_file_name),
          placeholderData: (previousData) => previousData
        }
    );

    const dataset = get(data, 'dataset'); 
    const statusCode = get(data, 'statusCode'); 

    if (error) {
      const statusVerb = getHttpStatusCodeVerb(toNumber(statusCode));
      let description = `An error occurred while fetching the dataset details:\n ${error}`;
      if (statusVerb !== null) {
          description = `An error occurred while fetching the dataset details (Status Code: ${statusCode} - ${statusVerb} ):\n ${error}`;
      }
      notification.error({
        message: 'Error',
        description
      });
    }

    return {
      data,
      dataset,
      isLoading,
      isError,
      error    
    };
}