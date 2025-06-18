import { notification } from 'antd';
import get from 'lodash/get';
import toNumber from 'lodash/toNumber';
import isEmpty from 'lodash/isEmpty';
import isString from 'lodash/isString';
import { useMutation, useQuery } from '@tanstack/react-query';
import { WorkflowType } from './types';

const BASE_API_URL = import.meta.env.VITE_AMP_URL;

export const fetchPrompt = async (use_case: string, params: unknown) => {
    if (use_case !== 'custom') {
        const resp = await fetch(`${BASE_API_URL}/${use_case}/gen_prompt`, {
            method: 'GET'
        });
        const body = await resp.json();
        return isString(body) ? body : null;

    } else if (use_case === 'custom') {
        if (isEmpty(params.custom_prompt)) {
            return undefined;
        }
        const resp = await fetch(`${BASE_API_URL}/create_custom_prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (resp.status !== 200) {
            const error = await resp.json();
            throw new Error(error.message || error.detail);
        }
        const body = await resp.json();
        const prompt = get(body, 'generated_prompt');
        return isString(prompt) ? prompt : null;
    }
}

export const useGetPromptByUseCase = (use_case: string, { model_id, inference_type, custom_prompt, caii_endpoint }: Record<string, string>) => {
    const params = {
        model_id,
        inference_type,
        custom_prompt   
    }
    if (inference_type === 'CAII') {
        params.caii_endpoint = caii_endpoint;
    }

    const { data, isLoading, isError, error, isFetching } = useQuery(
        {
            queryKey: ['fetchPrompt', fetchPrompt],
            queryFn: () => fetchPrompt(use_case, params),
            refetchOnWindowFocus: false,
        }
    );
    return {
      data,
      isLoading: isLoading || isFetching,
      isError,
      error    
    };
}

export const fetchCustomPrompt = async (params: unknown) => {
    if (params.use_case !== 'custom') {
        const resp = await fetch(`${BASE_API_URL}/${params.use_case}/gen_prompt`, {
            method: 'GET'
        });
        const body = await resp.json();
        return isString(body) ? body : null;

    } else if (params.use_case === 'custom') {
        const resp = await fetch(`${BASE_API_URL}/create_custom_prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (resp.status !== 200) {
            const error = await resp.json();
            throw new Error(error.message || error.detail);
        }
        const body = await resp.json();
        const prompt = get(body, 'generated_prompt');
        return isString(prompt) ? prompt : null;
    }
}

export const fetchFileContent = async (params: unknown) => {
    const resp = await fetch(`${BASE_API_URL}/json/get_content`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (resp.status !== 200) {
        const error = await resp.json();
        throw new Error(error.message || error.detail);
    }
    const body = await resp.json();
    const content = get(body, 'data');
    return content;
}

export const fetchSeedList = async (params: unknown) => {
    const resp = await fetch(`${BASE_API_URL}/json/get_seeds_list`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (resp.status !== 200) {
        const error = await resp.json();
        throw new Error(error.message || error.detail);
    }
    const body = await resp.json();
    const content = get(body, 'data');
    return content;
}

export const listModels = async (params: unknown) => {
    const resp = await fetch(`${BASE_API_URL}/model/model_ID`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (resp.status !== 200) {
        const error = await resp.json();
        throw new Error(error.message || error.detail);
    }
    const body = await resp.json();
    return body;
}

export const listFilesByPath = async (params: unknown) => {
    const resp = await fetch(`${BASE_API_URL}/get_project_files`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (resp.status !== 200) {
        const error = await resp.json();
        throw new Error(error.message || error.detail);
    }
    const body = await resp.json();
    const _files = get(body, '_files');
    const files = _files.map((_file: unknown) => {
        const name = get(_file, '_path');
        const size = toNumber(get(_file, '_file_size'));
        const _is_dir = get(_file, '_is_dir')

        return {
            ..._file,
            name,
            size,
            mime: _is_dir ? 'inode/directory' : ''
        }

    })
    return files;
}

export const useGetProjectFiles = () => {
    const mutation = useMutation({
        mutationFn: listFilesByPath
    });

    if (mutation.isError) {
        notification.error({
          message: 'Error',
          description: `An error occurred while fetching the list of project files.\n ${mutation.error}`
        });
    }
    return {
      listProjectFiles: mutation.mutate,
      fetching: mutation.isPending,
      error: mutation.error,
      isError: mutation.isError,
      data: mutation.data
    };
  };


  export const fetchDatasetSize = async (params: unknown) => {
    const resp = await fetch(`${BASE_API_URL}/json/dataset_size`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (resp.status !== 200) {
        const body_error = await resp.json();
        throw new Error('Error fetching dataset size' + get(body_error, 'error'));
    }
    const body = await resp.json();
    return get(body, 'dataset_size');
}

export const useDatasetSize = (
    workflow_type: WorkflowType,
    doc_paths: string[],
    input_key: string,
    input_value: string,
    output_key: string
 ) => {
    if (workflow_type !== WorkflowType.CUSTOM_DATA_GENERATION || isEmpty(doc_paths)) {
        return {
          data: 0
        }
    }
    const params = {
        input_path: doc_paths.map(item => item.value),
        input_key,
        input_value,
        output_key
    };

    const { data, isLoading, isError, error, isFetching } = useQuery(
        {
            queryKey: ['fetchDatasetSize', fetchPrompt],
            queryFn: () => fetchDatasetSize(params),
            refetchOnWindowFocus: false,
        }
    );

    if (isError) {
        notification.error({
          message: 'Error',
          description: `An error occurred while validating the dataset.\n ${error?.error}`
        });
    }
    return {
      data,
      isLoading: isLoading || isFetching,
      isError,
      error    
    };
 }

 export const fetchUseCases = async () => {
    const resp = await fetch(`${BASE_API_URL}/use-cases`, {
        method: 'GET'
    });
    const body = await resp.json();
    return body;
}

export const useGetUseCases = () => {
    const { data, isLoading, isError, error, isFetching } = useQuery(
        {
            queryKey: ['fetchUseCases', fetchUseCases],
            queryFn: () => fetchUseCases(),
            refetchOnWindowFocus: false,
        }
    );
    return {
      data,
      isLoading: isLoading || isFetching,
      isError,
      error    
    };
}