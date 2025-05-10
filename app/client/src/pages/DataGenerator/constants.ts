import { ModelProviders, ModelProvidersDropdownOpts } from './types';

export const MODEL_PROVIDER_LABELS = {
  [ModelProviders.BEDROCK]: 'AWS Bedrock',
  [ModelProviders.CAII]: 'Cloudera AI Inference Service'
};

export const MIN_SEED_INSTRUCTIONS = 1
export const MAX_SEED_INSTRUCTIONS = 500;
export const MAX_NUM_QUESTION = 100; 
export const DEMO_MODE_THRESHOLD = 25;


export const USECASE_OPTIONS = [
    { label: 'Code Generation', value: 'code_generation' },
    { label: 'Text to SQL', value: 'text2sql' },
    { label: 'Custom', value: 'custom' }
];

export const WORKFLOW_OPTIONS = [
    { label: 'Supervised Fine-Tuning', value: 'sft' },
    { label: 'Custom Data Generation', value: 'custom' },
    { label: 'Freeform Data Generation', value: 'freeform' }
];

export const MODEL_TYPE_OPTIONS: ModelProvidersDropdownOpts = [
    { label: MODEL_PROVIDER_LABELS[ModelProviders.BEDROCK], value: ModelProviders.BEDROCK},
    { label: MODEL_PROVIDER_LABELS[ModelProviders.CAII], value: ModelProviders.CAII },
];


export const getModelProvider = (provider: ModelProviders) => {
    return MODEL_PROVIDER_LABELS[provider];
};

export const getWorkflowType = (value: string) => {
    return WORKFLOW_OPTIONS.find((option) => option.value === value)?.label;
};

export const getUsecaseType = (value: string) => {
    return USECASE_OPTIONS.find((option) => option.value === value)?.label;
};

