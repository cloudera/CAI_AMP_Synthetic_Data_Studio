import { ModelProviders } from './types';

export const MODEL_PROVIDER_LABELS = {
  [ModelProviders.BEDROCK]: 'AWS Bedrock',
  [ModelProviders.CAII]: 'Cloudera AI Inference Service'
};

export const MIN_SEED_INSTRUCTIONS = 1
export const MAX_SEED_INSTRUCTIONS = 500;
export const MAX_NUM_QUESTION = 100; 
export const DEMO_MODE_THRESHOLD = 25
