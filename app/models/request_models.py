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
                "export_type":"local"
                
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
 