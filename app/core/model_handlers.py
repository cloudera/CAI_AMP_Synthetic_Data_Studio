from typing import List, Dict, Any, Optional
import json
import time
import boto3
from botocore.exceptions import ClientError, ConnectionClosedError, EndpointConnectionError
from urllib3.exceptions import ProtocolError
import ast
import re
from app.core.config import get_model_family, MODEL_CONFIGS
from app.models.request_models import ModelParameters
from openai import OpenAI
from app.core.exceptions import APIError, InvalidModelError, ModelHandlerError, JSONParsingError
from app.core.telemetry_integration import track_llm_operation
from app.core.config import  _get_caii_token
import os
from dotenv import load_dotenv
load_dotenv() 
import google.generativeai as genai 


def get_custom_endpoint_config(model_id: str, provider_type: str):
    """
    Get custom endpoint configuration for a model if it exists
    
    Args:
        model_id: The model identifier
        provider_type: The provider type
        
    Returns:
        Custom endpoint configuration or None
    """
    try:
        from app.core.custom_endpoint_manager import CustomEndpointManager
        
        custom_manager = CustomEndpointManager()
        return custom_manager.get_endpoint(model_id, provider_type)
                
    except Exception as e:
        print(f"Warning: Failed to get custom endpoint config: {e}")
        return None


class UnifiedModelHandler:
    """Unified handler for all model types using Bedrock's converse API"""
    
    # Add timeout constants
    OPENAI_CONNECT_TIMEOUT = 5.0
    OPENAI_READ_TIMEOUT = 3600.0  # 1 hour, same as AWS Bedrock
    
    GEMINI_TIMEOUT = 3600.0  # 1 hour timeout for Gemini
    
    def __init__(self, model_id: str, bedrock_client=None, model_params: Optional[ModelParameters] = None, inference_type = "aws_bedrock", caii_endpoint:Optional[str]=None, custom_p = False):
        """
        Initialize the model handler
        
        Args:
            model_id: The ID of the model to use
            bedrock_client: Optional pre-configured Bedrock client
            model_params: Optional model parameters
        """
        self.model_id = model_id
        self.bedrock_client = bedrock_client or boto3.client('bedrock-runtime')
        self.config = MODEL_CONFIGS.get(model_id, {})
        self.model_params = model_params or ModelParameters()
        self.inference_type = inference_type
        self.caii_endpoint = caii_endpoint
        self.custom_p = custom_p
        
        # AWS Step Functions style retry config
        self.MAX_RETRIES = 2
        self.BASE_DELAY = 3  # Initial delay of 3 seconds
        self.MULTIPLIER = 1.5  # AWS Step Functions multiplier
        
        # Add timeout configuration
        self.CONNECT_TIMEOUT = 5  # 5 seconds connect timeout
        self.READ_TIMEOUT = 3600  # 1 hour read timeout (same as AWS Bedrock)

    def _exponential_backoff(self, retry_count: int) -> None:
        """AWS Step Functions style backoff: 3s -> 4.5s -> 6.75s"""
        delay = self.BASE_DELAY * (self.MULTIPLIER ** retry_count)
        time.sleep(delay)

    def _extract_json_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract JSON array from text response with robust parsing.
        Handles both QA pairs and evaluation responses.
        
        Args:
            text: The text to parse
            
        Returns:
            List of dictionaries containing parsed JSON data
        """
        try:
            # If text is not a string, try to work with it as is
            if not isinstance(text, str):
                try:
                    if isinstance(text, (list, dict)):
                        return text if isinstance(text, list) else [text]
                    return []
                except:
                    return []

            # First attempt: Try direct JSON parsing of the entire text
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return parsed
                elif isinstance(parsed, dict):
                    return [parsed]
                return []
            except json.JSONDecodeError:
                # Continue with other parsing methods if direct parsing fails
                pass

            # Find JSON array boundaries
            start_idx = text.find('[')
            end_idx = text.rfind(']') + 1

            if start_idx != -1 and end_idx != -1:
                json_text = text[start_idx:end_idx]
                
                # Multiple parsing attempts
                try:
                    # Try parsing the extracted JSON
                    parsed = json.loads(json_text)
                    if isinstance(parsed, list):
                        return parsed
                    elif isinstance(parsed, dict):
                        return [parsed]
                except json.JSONDecodeError:
                    try:
                        # Try using ast.literal_eval
                        parsed = ast.literal_eval(json_text)
                        if isinstance(parsed, list):
                            return parsed
                        elif isinstance(parsed, dict):
                            return [parsed]
                    except (SyntaxError, ValueError):
                        # Try cleaning the text
                        cleaned = (json_text
                                .replace('\n', ' ')
                                .replace('\\n', ' ')
                                .replace("'", '"')
                                .replace('\t', ' ')
                                .strip())
                        try:
                            parsed = json.loads(cleaned)
                            if isinstance(parsed, list):
                                return parsed
                            elif isinstance(parsed, dict):
                                return [parsed]
                        except json.JSONDecodeError:
                            pass

            # If JSON parsing fails, try regex patterns for both formats
            results = []
            
            # Try to extract score and justification pattern
            score_pattern = r'"score":\s*(\d+\.?\d*),\s*"justification":\s*"([^"]*)"'
            score_matches = re.findall(score_pattern, text, re.DOTALL)
            if score_matches:
                for score, justification in score_matches:
                    results.append({
                        "score": float(score),
                        "justification": justification.strip()
                    })
                    
            # Try to extract question and solution pattern
            qa_pattern = r'"question":\s*"([^"]*)",\s*"solution":\s*"([^"]*)"'
            qa_matches = re.findall(qa_pattern, text, re.DOTALL)
            if qa_matches:
                for question, solution in qa_matches:
                    results.append({
                        "question": question.strip(),
                        "solution": solution.strip()
                    })

            if results:
                return results

            # If all parsing attempts fail, return the original text wrapped in a list
            return [{"text": text}]

        except Exception as e:
            print(f"ERROR: JSON extraction failed: {str(e)}")
            print(f"Raw text: {text}")
            return []


    #@track_llm_operation("generate")
    def generate_response(
        self,
        prompt: str,
        retry_with_reduced_tokens: bool = True,
        request_id: Optional[str] = None,
    ):
        if self.inference_type == "aws_bedrock":
            return self._handle_bedrock_request(prompt, retry_with_reduced_tokens)
        if self.inference_type == "CAII":
            return self._handle_caii_request(prompt)
        if self.inference_type == "openai":
            return self._handle_openai_request(prompt)
        if self.inference_type == "openai_compatible":
            return self._handle_openai_compatible_request(prompt)
        if self.inference_type == "gemini":
            return self._handle_gemini_request(prompt)
        raise ModelHandlerError(f"Unsupported inference_type={self.inference_type}", 400)

    def _handle_bedrock_request(self, prompt: str, retry_with_reduced_tokens: bool):
        """Handle Bedrock requests with retry logic"""
        retries = 0
        last_exception = None
        new_max_tokens = 8192
        while retries <= self.MAX_RETRIES:  # Changed to <= to match AWS behavior
            try:
                conversation = [{
                    "role": "user",
                    "content": [{"text": prompt}]
                }]
                additional_model_fields = {"top_k": self.model_params.top_k}
                
                if "claude" in self.model_id:
                    inference_config = {
                                "maxTokens": min(self.model_params.max_tokens, new_max_tokens),
                                "temperature": min(self.model_params.temperature, 1.0),
                                "topP": self.model_params.top_p,
                                "stopSequences": ["\n\nHuman:"],
                              
                             }
                    response = self.bedrock_client.converse(
                        modelId=self.model_id,
                        messages=conversation,
                        inferenceConfig=inference_config,
                        additionalModelRequestFields=additional_model_fields
                    )
                else:
                    inference_config = {
                                "maxTokens": min(self.model_params.max_tokens, new_max_tokens),
                                "temperature": min(self.model_params.temperature, 1.0),
                                "topP": self.model_params.top_p,
                               "stopSequences": []
                             }
                    print(inference_config)
                    response = self.bedrock_client.converse(
                        modelId=self.model_id,
                        messages=conversation,
                        inferenceConfig=inference_config
                       )
                
                try:
                    response_text = response["output"]["message"]["content"][0]["text"]
                    #print(response)
                    return self._extract_json_from_text(response_text) if not self.custom_p else response_text
                except KeyError as e:
                    print(f"Unexpected response format: {str(e)}")
                    print(f"Response structure: {response}")
                    raise ModelHandlerError(f"Unexpected response format: {str(e)}", status_code=500)

            except (ClientError, ConnectionClosedError, EndpointConnectionError, ProtocolError) as e:
                        error_message = str(e)
                        
                        # Check for specific connection errors
                        if "Connection was closed" in error_message or \
                           "EndpointConnectionError" in error_message or \
                           "Connection reset by peer" in error_message:
                            if retries < self.MAX_RETRIES:
                                print(f"Retry {retries + 1}: Connection error, retrying after backoff...")
                                print(f"Error details: {error_message}")
                                self._exponential_backoff(retries)
                                retries += 1
                                
                                # Create a new client on connection errors
                                self.bedrock_client = boto3.client(
                                    service_name="bedrock-runtime",
                                    config=self.bedrock_client.meta.config
                                )
                                continue
                        
                        # Handle other AWS errors
                        if isinstance(e, ClientError):
                            error_code = e.response['Error']['Code']
                            
                            if error_code == 'ValidationException':
                                if 'model identifier is invalid' in error_message:
                                    raise InvalidModelError(self.model_id,error_message )
                                elif "on-demand throughput isn't supported" in error_message:
                                    print("Hi")
                                    raise InvalidModelError(self.model_id, error_message)
                                
                                if retry_with_reduced_tokens and retries<1:
                                    new_max_tokens = 4096
                                    self._exponential_backoff(retries)
                                    retries += 1
                                    continue
                                if retry_with_reduced_tokens and retries==1 :
                                    new_max_tokens = 2048
                                    self._exponential_backoff(retries)
                                    print("trying with 2040 tokens")
                                    retries += 1
                                    continue
                                    
                            elif error_code in ['ThrottlingException', 'ServiceUnavailableException']:
                                if retries < self.MAX_RETRIES:
                                    self._exponential_backoff(retries)
                                    retries += 1
                                    continue
                        
                        raise ModelHandlerError(f"Bedrock API error: {error_message}", status_code=503)

            except Exception as e:
                last_exception = e
                if retries < self.MAX_RETRIES:
                    print(f"Retry {retries + 1}: Unexpected error, retrying after backoff...")
                    print(f"Error details: {str(e)}")
                    self._exponential_backoff(retries)
                    retries += 1
                    continue
                break

        if last_exception:
            print(f"All {self.MAX_RETRIES} retries exhausted. Final error: {str(last_exception)}")
            if isinstance(last_exception, (InvalidModelError, ModelHandlerError)):
                raise last_exception
            raise ModelHandlerError(f"Failed after {self.MAX_RETRIES} retries: {str(last_exception)}", status_code=500)


    # ---------- OpenAI -------------------------------------------------------
    def _handle_openai_request(self, prompt: str):
        try:
            import httpx
            from openai import OpenAI
            
            # Check for custom endpoint configuration
            custom_config = get_custom_endpoint_config(self.model_id, "openai")
            
            # Get API key from custom config or environment
            if custom_config:
                api_key = custom_config.api_key
                print(f"Using custom OpenAI endpoint for model: {self.model_id}")
            else:
                api_key = os.getenv('OPENAI_API_KEY')
            
            if not api_key:
                raise ModelHandlerError("OpenAI API key not available", 500)
            
            # Configure timeout for OpenAI client (OpenAI v1.57.2)
            timeout_config = httpx.Timeout(
                connect=self.OPENAI_CONNECT_TIMEOUT,
                read=self.OPENAI_READ_TIMEOUT,
                write=10.0,
                pool=5.0
            )
            
            # Configure httpx client with certificate verification for private cloud
            if os.path.exists("/etc/ssl/certs/ca-certificates.crt"):
                http_client = httpx.Client(
                    verify="/etc/ssl/certs/ca-certificates.crt",
                    timeout=timeout_config
                )
            else:
                http_client = httpx.Client(timeout=timeout_config)
            
            client = OpenAI(
                api_key=api_key,
                http_client=http_client
            )
            completion = client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=self.model_params.max_tokens,
                temperature=self.model_params.temperature,
                top_p=self.model_params.top_p,
                stream=False,
            )
            text = completion.choices[0].message.content
            return self._extract_json_from_text(text) if not self.custom_p else text
        except Exception as e:
            raise ModelHandlerError(f"OpenAI request failed: {e}", 500)

    # ---------- OpenAI Compatible -------------------------------------------------------
    def _handle_openai_compatible_request(self, prompt: str):
        """Handle OpenAI compatible endpoints with proper timeout configuration"""
        try:
            import httpx
            from openai import OpenAI
            
            # Check for custom endpoint configuration
            custom_config = get_custom_endpoint_config(self.model_id, "openai_compatible")
            
            if custom_config:
                # Use custom endpoint configuration
                api_key = custom_config.api_key
                openai_compatible_endpoint = custom_config.endpoint_url
                print(f"Using custom OpenAI compatible endpoint for model: {self.model_id}")
            else:
                # Fallback to environment variables and initialization parameters
                api_key = os.getenv('OpenAI_Endpoint_Compatible_Key')
                openai_compatible_endpoint = self.caii_endpoint
            
            if not api_key:
                raise ModelHandlerError("OpenAI compatible API key not available", 500)
            
            if not openai_compatible_endpoint:
                raise ModelHandlerError("OpenAI compatible endpoint not provided", 500)
            
            # Configure timeout for OpenAI compatible client (same as OpenAI v1.57.2)
            timeout_config = httpx.Timeout(
                connect=self.OPENAI_CONNECT_TIMEOUT,
                read=self.OPENAI_READ_TIMEOUT,
                write=10.0,
                pool=5.0
            )
            
            # Configure httpx client with certificate verification for private cloud
            if os.path.exists("/etc/ssl/certs/ca-certificates.crt"):
                http_client = httpx.Client(
                    verify="/etc/ssl/certs/ca-certificates.crt",
                    timeout=timeout_config
                )
            else:
                http_client = httpx.Client(timeout=timeout_config)
            
            # Remove trailing '/chat/completions' if present (similar to CAII handling)
            openai_compatible_endpoint = openai_compatible_endpoint.removesuffix('/chat/completions')
            
            client = OpenAI(
                api_key=api_key,
                base_url=openai_compatible_endpoint,
                http_client=http_client
            )
            
            completion = client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=self.model_params.max_tokens,
                temperature=self.model_params.temperature,
                top_p=self.model_params.top_p,
                stream=False,
            )
            
            print("generated via OpenAI Compatible endpoint")
            response_text = completion.choices[0].message.content
            
            return self._extract_json_from_text(response_text) if not self.custom_p else response_text
            
        except Exception as e:
            raise ModelHandlerError(f"OpenAI Compatible request failed: {str(e)}", status_code=500)

    # ---------- Gemini -------------------------------------------------------
    def _handle_gemini_request(self, prompt: str):
        if genai is None:
            raise ModelHandlerError(
                "google-generativeai library not installed — `pip install google-generativeai`",
                500,
            )
        try:
            # Check for custom endpoint configuration
            custom_config = get_custom_endpoint_config(self.model_id, "gemini")
            
            # Get API key from custom config or environment
            if custom_config:
                api_key = custom_config.api_key
                print(f"Using custom Gemini endpoint for model: {self.model_id}")
            else:
                api_key = os.getenv("GEMINI_API_KEY")
                
            if not api_key:
                raise ModelHandlerError("Gemini API key not available", 500)
                
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(self.model_id)  # e.g. 'gemini-1.5-pro-latest'
            resp = model.generate_content(
                prompt,
                generation_config={
                    "max_output_tokens": self.model_params.max_tokens,
                    "temperature": self.model_params.temperature,
                    "top_p": self.model_params.top_p,
                },
                request_options={
                    "timeout": self.GEMINI_TIMEOUT  # Use the dedicated Gemini timeout constant
                }
            )
            text = resp.text
            return self._extract_json_from_text(text) if not self.custom_p else text
        except Exception as e:
            raise ModelHandlerError(f"Gemini request failed: {e}", 500)


    def _handle_caii_request(self, prompt: str):
        """CAII implementation with proper timeout configuration (uses OpenAI SDK)"""
        try:
            import httpx
            from openai import OpenAI
            
            # Check for custom endpoint configuration
            custom_config = get_custom_endpoint_config(self.model_id, "caii")
            
            if custom_config:
                # Use custom endpoint configuration
                API_KEY = custom_config.cdp_token
                MODEL_ID = self.model_id
                caii_endpoint = custom_config.endpoint_url
                print(f"Using custom CAII endpoint for model: {self.model_id}")
            else:
                # Fallback to environment variables and initialization parameters
                API_KEY = _get_caii_token()
                MODEL_ID = self.model_id
                caii_endpoint = self.caii_endpoint
            
            if not API_KEY:
                raise ModelHandlerError("CAII API key not available", 500)
                
            if not caii_endpoint:
                raise ModelHandlerError("CAII endpoint not provided", 500)
            
            caii_endpoint = caii_endpoint.removesuffix('/chat/completions')
            
            # Configure timeout for CAII client (same as OpenAI since it uses OpenAI SDK v1.57.2)
            timeout_config = httpx.Timeout(
                connect=self.OPENAI_CONNECT_TIMEOUT,
                read=self.OPENAI_READ_TIMEOUT,
                write=10.0,
                pool=5.0
            )
            
            # Configure httpx client with certificate verification for private cloud
            if os.path.exists("/etc/ssl/certs/ca-certificates.crt"):
                http_client = httpx.Client(
                    verify="/etc/ssl/certs/ca-certificates.crt",
                    timeout=timeout_config
                )
            else:
                http_client = httpx.Client(timeout=timeout_config)
            
            client_ca = OpenAI(
                base_url=caii_endpoint,
                api_key=API_KEY,
                http_client=http_client
            )

            completion = client_ca.chat.completions.create(
                model=MODEL_ID,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.model_params.temperature,
                top_p=self.model_params.top_p,
                max_tokens=self.model_params.max_tokens,
                stream=False
            )

            print("generated via CAII")
            response_text = completion.choices[0].message.content
            
            return self._extract_json_from_text(response_text) if not self.custom_p else response_text
            
        except Exception as e:
            raise ModelHandlerError(f"CAII request failed: {str(e)}", status_code=500)

def create_handler(model_id: str, bedrock_client=None, model_params: Optional[ModelParameters] = None, inference_type:Optional[str] = "aws_bedrock", caii_endpoint:Optional[str]=None, custom_p = False) -> UnifiedModelHandler:
    """
    Factory function to create model handler
    
    Args:
        model_id: The ID of the model to use
        bedrock_client: Optional pre-configured Bedrock client
        model_params: Optional model parameters
        
    Returns:
        UnifiedModelHandler instance
    """
    return UnifiedModelHandler(model_id, bedrock_client, model_params, inference_type, caii_endpoint, custom_p)