import { ModelParameters } from '../Evaluator/types';

export interface Example {
    question: string;
    solution: string;
};

export interface Evaluation {
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
}

export interface DatasetDetails {
    generation: DatasetGeneration;
}

export interface DatasetGeneration {
    [key: string]: string;
}

export interface Template {
    id: string;
    name: string;
    tag: string[];
    description: string;
}