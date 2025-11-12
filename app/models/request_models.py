from typing import List, Dict, Optional, Any, Union
import os
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum
from app.core.config import USE_CASE_CONFIGS, UseCase


# class UseCase(str, Enum):
#     CODE_GENERATION = "code_generation"
#     TEXT2SQL = "text2sql"
#     CUSTOM = "custom"

class Technique(str, Enum):
    SFT = "sft"
    Custom_Workflow = "custom_workflow"
    Model_Alignment = "model_alignment"
    Freeform = "freeform"
    

class Example(BaseModel):
    """Structure for QA examples"""
    question: str
    solution: str
    
    model_config = ConfigDict(protected_namespaces=(),
        json_schema_extra={
            "example": {
                "question": "How do you read a CSV file in Python?",
                "solution": "Use pandas: pd.read_csv('file.csv')"
            }
        }
    )

class Example_eval(BaseModel):
    """Structure for QA examples"""
    score: float
    justification: str
    
    model_config = ConfigDict(protected_namespaces=(),
        json_schema_extra={
            "example": {
                            "score": 4,
                            "justification": "The code is well-structured, includes error handling, and follows Python best practices. It demonstrates good use of context managers and proper file handling."
                        }
        }
    )

class EvaluationExample(BaseModel):
    question: str
    answer: str
    score: float
    justification: str


# In app/models/request_models.py
class S3Config(BaseModel):
    """S3 export configuration"""
    bucket: str
    key: str = ""  # Make key optional with default empty string
    create_if_not_exists: bool = True  # Flag to create bucket if it doesn't exist

class HFConfig(BaseModel):
    """HF export configuration"""
    
    hf_repo_name: str
    hf_username: str
    hf_token:str
    hf_commit_message: Optional[str] = "Hugging face export"  # Commit message

class Export_synth(BaseModel):
    # Existing fields...
    export_type: List[str] = Field(default_factory=lambda: ["huggingface"])
    file_path: str
    display_name: Optional[str] = None
    output_key: Optional[str] = 'Prompt'
    output_value: Optional[str] = 'Completion'

    # Hugging Face-specific fields
    hf_config: Optional[HFConfig] = None  # Make HF config optional

    # Optional s3 config
    s3_config: Optional[S3Config] = None

    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "export_type": ["huggingface", "s3"],
                "file_path": "qa_pairs_claude_20241204_132411_test.json",
                "hf_config": {
                    "hf_token": "your token",
                    "hf_username": "your_username",
                    "hf_repo_name": "file_name",
                    "hf_commit_message": "dataset trial"
                },
                "s3_config": {
                    "bucket": "my-dataset-bucket",
                    "create_if_not_exists": True
                }
            }
        }
    )


class ModelParameters(BaseModel):
    """Low-level model parameters"""
    temperature: float = Field(default=0.0, ge=0.0, le=2.0, description="Controls randomness (0.0 to 1.0)")
    top_p: float = Field(default=1.0, ge=0.0, le=1.0, description="Nucleus sampling threshold")
    min_p: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum probability threshold")
    top_k: int = Field(default=150, ge=0, description="Top K sampling parameter")
    max_tokens: int = Field(default=8192, ge=1, description="Maximum tokens to generate")

class JsonDataSize(BaseModel):
    input_path: List[str]
    input_key: Optional[str] = 'Prompt'

class RelativePath(BaseModel):
    path: Optional[str] = ""
    

class SynthesisRequest(BaseModel):
    """Main request model for synthesis"""
    use_case: UseCase | None = Field(default=UseCase.CUSTOM)  # Optional with default=CUSTOM
    model_id: str
    num_questions: int | None = Field(default=1, gt=0)  # Optional with default=1
    technique: Technique | None = Field(default=Technique.SFT)  # Optional with default=SFT
    is_demo: bool = True
    
    # Optional fields that can override defaults
    inference_type: Optional[str] = "aws_bedrock"
    caii_endpoint: Optional[str] = None
    openai_compatible_endpoint: Optional[str] = None
    topics: Optional[List[str]] = None
    doc_paths: Optional[List[str]] = None
    input_path: Optional[List[str]] = None
    input_key: Optional[str] = 'Prompt'
    output_key: Optional[str] = 'Prompt'
    output_value: Optional[str] = 'Completion'
    examples: Optional[List[Example]] = Field(default=None)  # If None, will use default examples
    example_custom: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="JSON array where each object has the same structure (consistent columns), but the structure itself can be defined flexibly per use case"
    )
    example_path: Optional[str] = None
    schema: Optional[str] = None  # Added schema field
    custom_prompt: Optional[str] = None 
    display_name: Optional[str] = None
    max_concurrent_topics: Optional[int] = Field(
        default=5, 
        ge=1, 
        le=100, 
        description="Maximum number of concurrent topics to process (1-100)"
    ) 
    
    # Optional model parameters with defaults
    model_params: Optional[ModelParameters] = Field(
        default=None,
        description="Low-level model generation parameters"
    )

    model_config = ConfigDict(protected_namespaces=(),
        json_schema_extra={
            "example": {
                "use_case": "code_generation",
                "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
                "inference_type": "aws_bedrock",
                "num_questions": 3,
                "technique": "sft",
                "topics": ["python_basics", "data_structures"],
                "is_demo": True,
                "max_concurrent_topics": 5
                
            }
        }
    )





class SynthesisResponse(BaseModel):
    """Response model for synthesis results"""
    job_id: str
    status: str
    topics_processed: List[str]
    qa_pairs: Dict[str, List[Example]]  # Topic to QA pairs mapping
    export_path: Optional[str] = None
    error: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=(),
        json_schema_extra={
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "completed",
                "topics_processed": ["python_basics"],
                "qa_pairs": {
                    "python_basics": [
                        {
                            "question": "How do you read a CSV file?",
                            "solution": "Using pandas..."
                        }
                    ]
                },
                "export_path": "qa_pairs_claude_20240220.json"
            }
        }
    )

class EvaluationRequest(BaseModel):
    """Request model for evaluating generated QA pairs"""
    use_case: UseCase
    technique: Technique | None = Field(default=Technique.SFT) 
    model_id: str
    import_path: Optional[str] = None
    import_type: str = "local" 
    is_demo:bool = True
    inference_type :Optional[str] = "aws_bedrock"
    caii_endpoint: Optional[str] = None
    examples: Optional[List[Example_eval]] = Field(default=None)
    custom_prompt: Optional[str] = None 
    display_name: Optional[str] = None 
    output_key: Optional[str] = 'Prompt'
    output_value: Optional[str] = 'Completion'
    max_workers: Optional[int] = Field(
        default=4, 
        ge=1, 
        le=100, 
        description="Maximum number of worker threads for parallel evaluation (1-100)"
    )

    # Export configuration
    export_type: str = "local"  # "local" or "s3"
    s3_config: Optional[S3Config] = None

    model_params: Optional[ModelParameters] = Field(
        default=None,
        description="Low-level model generation parameters"
    )

    model_config = ConfigDict(protected_namespaces=(),
        json_schema_extra={
            "example": {
                "use_case": "code_generation",
                "model_id": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                "inference_type": "aws_bedrock",
                "import_path": "qa_pairs_llama3-1-70b-instruct-v1:0_20241114_212837_test.json",
                "import_type": "local",
                "export_type":"local",
                "max_workers": 4
                
            }
        }
    )


class CustomPromptRequest(BaseModel):
    """Request model for evaluating generated QA pairs"""
    
    model_id: str
    custom_prompt: str
    
    inference_type :Optional[str] = "aws_bedrock"
    caii_endpoint: Optional[str] = None
    example_path: Optional[str] = None
    example: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="JSON array where each object has the same structure (consistent columns), but the structure itself can be defined flexibly per use case"
    )
    custom_p:bool =True

    model_config = ConfigDict(protected_namespaces=(),
        json_schema_extra={
            "example": {
                
                "model_id": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                
                "custom_prompt": """Language to language translation""",
                "inference_type": "aws_bedrock",
                                                
                
            }
        }
    )


# Custom Endpoint Models - Simplified (No Credentials Stored)
# Credentials are managed separately via CredentialManager and environment variables

class CustomEndpointBase(BaseModel):
    """
    Base model for custom endpoints.
    
    Only stores metadata (model_id, provider_type, optional endpoint_url).
    Credentials are managed separately via environment variables.
    """
    model_id: str = Field(..., description="Model identifier")
    provider_type: str = Field(..., description="Provider type: 'caii', 'bedrock', 'openai', 'openai_compatible', 'gemini'")
    endpoint_url: Optional[str] = Field(default=None, description="Endpoint URL (required for CAII and OpenAI Compatible)")
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "model_id": "meta/llama-3.1-70b-instruct",
                    "provider_type": "caii",
                    "endpoint_url": "https://caii-prod.site/endpoints/llama/v1/chat/completions"
                },
                {
                    "model_id": "gpt-4",
                    "provider_type": "openai"
                },
                {
                    "model_id": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                    "provider_type": "bedrock"
                }
            ]
        }
    )


# Alias for backward compatibility
CustomEndpoint = CustomEndpointBase


class AddCustomEndpointRequest(BaseModel):
    """Request model for adding custom endpoints"""
    endpoint_config: CustomEndpointBase = Field(..., description="Custom endpoint configuration")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "endpoint_config": {
                    "model_id": "meta/llama-3.1-70b-instruct",
                    "provider_type": "caii",
                    "endpoint_url": "https://caii-prod.site/endpoints/llama/v1/chat/completions"
                }
            }
        }
    )


class SetCredentialsRequest(BaseModel):
    """
    Request model for setting credentials.
    
    Credentials are stored in environment variables and persisted to .credentials.env.json.
    They are NOT stored in the endpoint configuration.
    """
    credentials: Dict[str, str] = Field(..., description="Dictionary of credential key-value pairs")
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "credentials": {
                        "CDP_TOKEN": "eyJhbGc...",
                        "OPENAI_API_KEY": "sk-..."
                    }
                },
                {
                    "credentials": {
                        "AWS_ACCESS_KEY_ID": "AKIA...",
                        "AWS_SECRET_ACCESS_KEY": "...",
                        "AWS_REGION": "us-west-2"
                    }
                }
            ]
        }
    )


class TestEndpointRequest(BaseModel):
    """
    Request model for testing model endpoints.
    
    Tests endpoint using existing environment variables (no credentials in request).
    User must set credentials first via /set_credentials.
    """
    provider_type: str = Field(..., description="Provider type: 'caii', 'bedrock', 'openai', 'openai_compatible', 'gemini'")
    model_id: str = Field(..., description="Model identifier")
    endpoint_url: Optional[str] = Field(default=None, description="Endpoint URL (optional, will lookup from saved endpoints if not provided)")
    
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                   "provider_type": "bedrock",
                    "model_id": "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
                },
                {
                    "provider_type": "openai",
                    "model_id": "gpt-4"
                },
                {
                    "provider_type": "caii",
                    "model_id": "llama-3.1-70b-instruct",
                    "endpoint_url": "https://caii-prod.site/endpoints/llama/v1/chat/completions"
                }
            ]
        }
    )


class CustomEndpointListResponse(BaseModel):
    """Response model for listing custom endpoints"""
    endpoints: List[CustomEndpoint] = Field(default=[], description="List of custom endpoints")
    total: int = Field(..., description="Total number of custom endpoints")