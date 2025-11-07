import { ModelParameters, Pages } from "./types";

// No job is being executed if dataset or evaluation on dataset total_count is less than this threshold
export const JOB_EXECUTION_TOTAL_COUNT_THRESHOLD = 25;

export const LABELS = {
    [Pages.HOME]: 'Home',
    [Pages.GENERATOR]: 'Generation',
    [Pages.EVALUATOR]: 'Evaluator',
    [Pages.DATASETS]: 'Datasets',
    [Pages.EVALUATIONS]: 'Evaluations',
    [Pages.EXPORTS]: 'Exports',
    [Pages.HISTORY]: 'History',
    [Pages.FEEDBACK]: 'Feedback',
    [Pages.SETTINGS]: 'Settings',
    //[Pages.TELEMETRY]: 'Telemetry',
    [ModelParameters.TEMPERATURE]: 'Temperature',
    [ModelParameters.TOP_K]: 'Top K',
    [ModelParameters.TOP_P]: 'Top P',
    [ModelParameters.MAX_TOKENS]: 'Max Tokens'
};

export const TRANSLATIONS: Record<string, string> = {
    "code_generation": "Code Generation",
    "text2sql": "Text to SQL",
    "custom": "Custom",
    "lending_data": "Lending Data",
    "credit_card_data": "Credit Card Data",
    "ticketing_dataset": "Ticketing Dataset"
  };

export const CDSW_PROJECT_URL = import.meta.env.VITE_CDSW_PROJECT_URL;
export const IS_COMPOSABLE = import.meta.env.VITE_IS_COMPOSABLE;
