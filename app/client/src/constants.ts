import { ModelParameters, Pages } from "./types";

export const LABELS = {
    [Pages.HOME]: 'Home',
    [Pages.GENERATOR]: 'Generator',
    [Pages.EVALUATOR]: 'Evaluator',
    [Pages.DATASETS]: 'Datasets',
    [Pages.HISTORY]: 'History',
    [ModelParameters.TEMPERATURE]: 'Temperature',
    [ModelParameters.TOP_K]: 'Top K',
    [ModelParameters.TOP_P]: 'Top P',
    [ModelParameters.MAX_TOKENS]: 'Max Tokens'
};

export const TRANSLATIONS: Record<string, string> = {
    "code_generation": "Code Generation",
    "text2sql": "Text to SQL"
  };

