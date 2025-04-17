import { Dispatch, ReactElement, SetStateAction } from 'react';

export enum DataGenWizardSteps {
    CONFIGURE = 'configure',
    PROMPT = 'prompt',
    EXAMPLES = 'examples',
    SUMMARY = 'summary',
    FINISH = 'finish',
}

export enum Usecases {
    CODE_GENERATION = 'code_generation',
    TEXT2SQL = 'text2sql',
    CUSTOM = 'CUSTOM'
}

export enum ModelProviders {
    BEDROCK = 'aws_bedrock',
    CAII = 'CAII'
}

export type ModelProvidersDropdownOpts = { label: string, value: ModelProviders }[];
export type QuestionSolution = { question: string, solution: string}
export type JustificationScore = { justification: string, score: number}

export interface GenDatasetRequest {
    export_type?: {
        local: string;
    }
    model_id?: string;
    model_type?: string;
    num_questions?: number;
    schema?: string;
    technique?: string;
    topics?: string[];
    use_case?: Usecases
    is_demo?: boolean;
    results?: any
}

export interface GenDatasetResponse {
    export_path: {
        local: string;
    };
    results: {
        [key: string]: QuestionSolution[]
    }
}

export interface UseCaseResponse {
    [Usecases.CODE_GENERATION]: {
        name: string;
        default_topics: {
            python_basics: {
                name: string;
                description: string;
                example_questions: QuestionSolution[],
            },
            data_structures: {
                name: string;
                description: string;
                example_questions: QuestionSolution[],
            }
        },
        example_format: QuestionSolution
    },
    [Usecases.TEXT2SQL]: {
        name: string;
        default_topics: {
            basic_queries: {
                name: string;
                description: string;
                example_questions: QuestionSolution[],
            },
            joins: {
                name: string;
                description: string;
                example_questions: QuestionSolution[],
            }
        },
        example_format: QuestionSolution
    },
}

export interface WizardStepConfig {
    title: string;
    key: string;
    content: ReactElement;
    required?: boolean;
}

export interface WizardCtxObj {
    setIsStepValid: Dispatch<SetStateAction<boolean>>
}

export interface File {
    name: string;
    size: number;
    mime: string;
    mtime: string;
    url: string;
    path: string;
}

export enum WorkflowType {
    SUPERVISED_FINE_TUNING = 'supervised-fine-tuning',
    CUSTOM_DATA_GENERATION = "custom",
    FREE_FORM_DATA_GENERATION = "freeform"
}

export interface CustomResult {
    question: string;
    solution: string;
}

export enum TechniqueType {
    SFT = 'sft',
    CUSTOME_WORKFLOW = 'custom_workflow',
    FREE_FORM = 'freeform'
}