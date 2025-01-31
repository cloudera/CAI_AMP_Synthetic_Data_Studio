from typing import List, Dict, Any, Optional
import json
import boto3
from botocore.exceptions import ClientError
import ast
import re
from app.core.config import get_model_family, MODEL_CONFIGS
from app.models.request_models import ModelParameters
from openai import OpenAI
from app.core.exceptions import APIError, InvalidModelError, ModelHandlerError



class UnifiedModelHandler:
    """Unified handler for all model types using Bedrock's converse API"""
    
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

    def generate_response(self, prompt: str, retry_with_reduced_tokens: bool = True) -> List[Dict[str, str]]:
        """
        Generate response from the model
        
        Args:
            prompt: The input prompt
            retry_with_reduced_tokens: Whether to retry with reduced tokens on failure
            
        Returns:
            List of dictionaries containing the model's response
        """
        try:

            if self.inference_type== "aws_bedrock":
            
                # Prepare the conversation format
                conversation = [{
                    "role": "user",
                    "content": [{"text": prompt}]
                }]
                
                # Prepare inference config
                inference_config = {
                    "maxTokens": self.model_params.max_tokens or self.config.get('max_tokens', 8192),
                    "temperature": self.model_params.temperature,
                    "topP": self.model_params.top_p,
                    "stopSequences": ["\n\nHuman:"]
                }
                
                try:
                    # First attempt with full tokens
                    response = self.bedrock_client.converse(
                        modelId=self.model_id,
                        messages=conversation,
                        inferenceConfig=inference_config
                    )
                    
                except ClientError as e:
                    if 'ValidationException' in str(e):
                        if 'model identifier is invalid' in str(e):
                            #print("Hi")
                            
                            raise InvalidModelError(self.model_id)
                        if retry_with_reduced_tokens:
                            print(f"Retrying with reduced token count due to: {str(e)}")
                            # Retry with reduced tokens
                            inference_config["maxTokens"] = 4096
                            response = self.bedrock_client.converse(
                                modelId=self.model_id,
                                messages=conversation,
                                inferenceConfig=inference_config
                            )
                    else:
                        raise ModelHandlerError(str(e), status_code=503)
                
                # Extract and parse the response
                try:
                    response_text = response["output"]["message"]["content"][0]["text"]
                    #print(response_text)
                    
                except KeyError as e:
                    print(f"Unexpected response format: {str(e)}")
                    print(f"Response structure: {response}")
                    raise ModelHandlerError(f"Unexpected response format: {str(e)}", status_code=500)
                
                if self.custom_p:
                    return response_text


                return self._extract_json_from_text(response_text)
            
            elif self.inference_type== "CAII":
                print("I am here")
                API_KEY = json.load(open("/tmp/jwt"))["access_token"]
                #print(API_KEY)
                MODEL_ID = self.model_id
                caii_endpoint = self.caii_endpoint
               
                
                caii_endpoint = caii_endpoint.removesuffix('/chat/completions') 
                client_ca = OpenAI(
                                        base_url = caii_endpoint,
                                        api_key = API_KEY,
                                        )

                completion = client_ca.chat.completions.create(
                  model=MODEL_ID,
                  messages=[{"role":"user","content":prompt}],
                  temperature=self.model_params.temperature,
                  top_p=self.model_params.top_p,
                  max_tokens=self.model_params.max_tokens,
                  stream=False
                )

                print("generated via CAII")

                try:
                    response_text = completion.choices[0].message.content
                    #print(response_text)
                    
                except KeyError as e:
                    print(f"Unexpected response format: {str(e)}")
                    print(f"Response structure: {response}")
                    raise ModelHandlerError(f"Unexpected response format: {str(e)}", status_code=500)
                
                if self.custom_p:
                    return response_text
                
                return self._extract_json_from_text(response_text)                
                
        except ModelHandlerError:
            raise  # Re-raise ModelHandlerError exceptions
        except Exception as e:
            raise ModelHandlerError(f"Unexpected error in model handler: {str(e)}", status_code=500)

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