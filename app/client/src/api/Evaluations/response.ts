import { PaginatedResponse } from '../common/pagination';

export type EvaluationResponse = { 
    id: string;
    timestamp: Date;
    model_id: string;
    use_case: string;
    final_prompt: string;
    model_parameters: ModelParameters;
    generate_file_name: string;
    evaluate_file_name: string;
    display_name: string;
    local_export_path: string;
    examples: Example[];
    average_score: number;
    custom_prompt: string;
    inference_type: string;
    job_id: string;
    job_name: string;
    job_status: string;
};

export type DeleteEvaluationResponse = {
   message: string;
};

export type ModelParameters = {
    temperature: number;
    top_p: number;
    min_p: number;
    top_k: number;
    max_tokens: number;
};

export type Example = {
    score: number;
    justification: string;
};

// Add paginated response types
export type PaginatedEvaluationsResponse = PaginatedResponse<EvaluationResponse>;