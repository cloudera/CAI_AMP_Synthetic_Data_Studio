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
    const url = `${baseUrl}/use-cases/${isEmpty(useCase) ? 'custom' : useCase}/topics`;
    return useFetch(url);
}

export const useFetchExamples = (useCase: string): UseFetchApiReturn<FetchExamplesResp> => {
    const url = `${baseUrl}/${isEmpty(useCase) ? 'custom' : useCase}/gen_examples`;
    return useFetch(url);
}

export const useFetchModels = (): UseFetchApiReturn<FetchModelsResp> => {
    const url = `${baseUrl}/model/model_id_filter`;
    return useFetch(url);
}

export const useFetchDefaultPrompt = (useCase: string, workflowType?: WorkerType): UseFetchApiReturn<FetchDefaultPromptResp> => {
    let url = `${baseUrl}/${isEmpty(useCase) ? 'custom' : useCase}/gen_prompt`;
    if (workflowType && workflowType === 'freeform') {
        url = `${baseUrl}/${isEmpty(useCase) ? 'custom' : useCase}/gen_freeform_prompt`;
    }
    return useFetch(url);
}

export const useFetchDefaultSchema = (): UseFetchApiReturn<FetchDefaultSchemaResp> => {
    const url = `${baseUrl}/sql_schema`;
    return useFetch(url);
}

export const useFetchDefaultModelParams = (): UseFetchApiReturn<FetchDefaultParamsResp> => {
    const url = `${baseUrl}/model/parameters`;
    return useFetch(url);
}

export const useTriggerDatagen = <T>(workflow_type: string) => {
    const genDatasetUrl = `${import.meta.env.VITE_AMP_URL}/synthesis/${workflow_type === 'freeform' ? 'freeform' : 'generate'}`;
    return usePostApi<T>(genDatasetUrl);
}
