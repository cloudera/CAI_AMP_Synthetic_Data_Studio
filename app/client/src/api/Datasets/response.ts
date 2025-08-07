import { PaginatedResponse } from '../common/pagination';

export type DatasetResponse = {
    id: number;
    timestamp: string;
    model_id: string;
    use_case: string;
    final_prompt: string;
    model_parameters: ModelParameters;
    generate_file_name: string;
    display_name: string | null;
    local_export_path: string;
    hf_export_path: string | null;
    Question_per_topic: number;
    topics: string[];
    examples: Example[];
    schema: string | null;
    custom_prompt: string;
    total_count: number;
    num_questions: number;
    job_id: string;
    job_name: string;
    job_status: string;
    inference_type: string;
    completed_rows: number; // Add this line
};

export type ModelParameters = {
    temperature: number;
    top_p: number;
    min_p: number;
    top_k: number;
    max_tokens: number;
};

export type Example = {
    question: string;
    solution: string;
};

export type DeleteDatasetResponse = {
   message: string;
};

export type ExportDatasetResponse = {
    message: Partial<ExportMessageSuccessResponse>;
};

export type ExportMessageSuccessResponse = {
    job_name: string;
    job_id: string;
    hf_link: string;
};

// Add paginated response types
export type PaginatedDatasetsResponse = PaginatedResponse<DatasetResponse>;