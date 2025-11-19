export enum ModelProviderType {
    OPENAI = 'openai',
    OPENAI_COMPATIBLE = 'openai_compatible',
    GEMINI = 'gemini',
    CAII = 'caii',
    AWS_BEDROCK = 'aws_bedrock'
}

export interface ModelProviderCredentials {
    providerType: ModelProviderType;
    isSet: boolean; 
}
