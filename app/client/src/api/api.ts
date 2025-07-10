import isEmpty from 'lodash/isEmpty';
import { useFetch, usePostApi } from './hooks';
import {
    FetchDefaultParamsResp,
    FetchDefaultPromptResp,
    FetchDefaultSchemaResp,
    FetchExamplesResp,
    FetchModelsResp,
    FetchTopicsResp,
    UseFetchApiReturn
} from './types';

const baseUrl = import.meta.env.VITE_AMP_URL;

export const usefetchTopics = (useCase: string): UseFetchApiReturn<FetchTopicsResp> => {
    const url = isEmpty(useCase) ? '' : `${baseUrl}/use-cases/${useCase}/topics`;
    return useFetch(url);
}

export const useFetchExamples = (useCase: string): UseFetchApiReturn<FetchExamplesResp> => {
    const url = isEmpty(useCase) ? '' : `${baseUrl}/${useCase}/gen_examples`;
    return useFetch(url);
}

export const useFetchModels = (): UseFetchApiReturn<FetchModelsResp> => {
    const url = `${baseUrl}/model/model_ID`;
    return useFetch(url);
}

export const useFetchDefaultPrompt = (useCase: string, workflowType?: string): UseFetchApiReturn<FetchDefaultPromptResp> => {
    if (isEmpty(useCase)) {
        return { data: null, loading: false, error: null };
    }
    
    let url = `${baseUrl}/${useCase}/gen_prompt`;
    if (workflowType && workflowType === 'freeform') {
        url = `${baseUrl}/${useCase}/gen_freeform_prompt`;
    }
    return useFetch(url);
}

export const useFetchDefaultSchema = (shouldFetch: boolean = true): UseFetchApiReturn<FetchDefaultSchemaResp> => {
    const url = shouldFetch ? `${baseUrl}/sql_schema` : '';
    return useFetch(url);
}

export const useFetchDefaultModelParams = (shouldFetch: boolean = true): UseFetchApiReturn<FetchDefaultParamsResp> => {
    const url = shouldFetch ? `${baseUrl}/model/parameters` : '';
    return useFetch(url);
}

export const useTriggerDatagen = <T>(workflow_type: string) => {
    const genDatasetUrl = `${import.meta.env.VITE_AMP_URL}/synthesis/${workflow_type === 'freeform' ? 'freeform' : 'generate'}`;
    return usePostApi<T>(genDatasetUrl);
}
