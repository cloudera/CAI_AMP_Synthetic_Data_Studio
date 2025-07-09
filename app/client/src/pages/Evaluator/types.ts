import { Example } from "../../api/Evaluations/response";


export interface ModelParameters {
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
  max_tokens: number;
}

export interface Dataset {
  custom_prompt: string; 
  display_name: string;
  generate_file_name: string;
  model_id: string;
  model_parameters: ModelParameters;
  use_case: string;
  hf_export_path: string | null;
  Question_per_topic: number;
  topics: string[];
  examples: Example[];
  schema: string | null;
  total_count: number;
  completed_rows: number | null;
  num_questions: number;
  job_id: string;
  job_name: string;
  job_status: string;
  inference_type: string;
  local_export_path: string;
  output_key: string;
  output_value: string;
  doc_paths: string[] | null;
  input_path: string[] | null;
  workflow_type: string;
  technique: string;
}

export interface TopicEvaluationResult {
  average_score: number;
  min_score: number;
  max_score: number;
  evaluated_pairs: EvaluatedPair[];    
}

export interface Evaluation {
  score: number;
  justification: string;
}

export interface EvaluatedPair {
  question: string;
  solution: string;
  evaluation: Evaluation;
}


export interface EvaluateResult {
  [key: string]: TopicEvaluationResult;    
}

export interface EvaluateExample {
  justification: string;
  score: string;    
}

export interface EvaluateExampleRecord extends EvaluateExample {
  index: number;
}

export interface Evaluate {
  average_score: number;
  custom_prompts: string;
  display_name: string;
  evaluate_file_name: string;
  examples: EvaluateExample[];
  generate_file_name: string;
  inference_type: string;
  model_id: string;
  model_parameters: ModelParameters[];
  use_case: string;
}

export enum ViewType {
  EVALUATE_F0RM = 'EVALUATE_F0RM',  
  REEVALUATE_F0RM = 'REEVALUATE_F0RM',
  SUCCESS_VIEW = 'SUCCESS_VIEW'
}

export interface EvaluationDetails { 
  evaluation: EvaluateResult;
}