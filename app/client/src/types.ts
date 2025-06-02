export enum Pages {
    GENERATOR = 'data-generator',
    REGENERATE = 're-generate',
    EVALUATOR = 'evaluator',
    HISTORY = 'history',
    HOME = 'home',
    DATASETS = 'datasets',
    WELCOME = 'welcome',
    FEEDBACK = 'feedback',
    UPGRADE = 'upgrade'
    //TELEMETRY = 'telemetry' 
}

export enum ModelParameters {
    TOP_K = 'top_k',
    TOP_P = 'top_p',
    MIN_P = 'min_p',
    TEMPERATURE = 'temperature',
    MAX_TOKENS = 'max_tokens'
}

export enum Usecases {
    CODE_GENERATION = 'code_generation',
    TEXT2SQL = 'text2sql'
}

export type ExportType = 'huggingface';

export const MODEL_PARAMETER_LABELS: Record<ModelParameters, string> = {
    [ModelParameters.TOP_K]: 'Top K',
    [ModelParameters.TOP_P]: 'Top P',
    [ModelParameters.MIN_P]: 'Min P',
    [ModelParameters.TEMPERATURE]: 'Temperature',
    [ModelParameters.MAX_TOKENS]: 'Max Tokens',
};

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
    'huggingface': 'Huggingface'
}

// Coming from EngineStatusType in CML
// null and default are not part of the enum in CML. 
// null when backend return null
// default when backend returns something that is not defined here but we have to show something
export type JobStatus = 'ENGINE_STOPPED' | 'ENGINE_SUCCEEDED' | 'ENGINE_TIMEDOUT' | 'ENGINE_SCHEDULING' | 'ENGINE_RUNNING' | 'null' | 'default';


export const HuggingFaceIconUrl = "https://huggingface.co/front/assets/huggingface_logo-noborder.svg";