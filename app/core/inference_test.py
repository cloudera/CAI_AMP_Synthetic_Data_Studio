"""
Simple inference testing for model endpoints.

Tests models with actual inference calls using small prompts.
"""

import os
import asyncio
from typing import Dict, Any
from app.core.model_handlers import UnifiedModelHandler
from app.core.config import _get_caii_token


TEST_PROMPT = "Hello"
TEST_MAX_TOKENS = 10


async def test_inference(
    provider_type: str,
    model_id: str,
    endpoint_url: str = None
) -> Dict[str, Any]:
    """
    Test a model by making a simple inference call.
    
    Args:
        provider_type: Provider type (openai, gemini, bedrock, caii, openai_compatible)
        model_id: Model identifier
        endpoint_url: Endpoint URL (required for caii and openai_compatible)
        
    Returns:
        Dict with status, message, and details
    """
    try:
        # Map provider type to inference type
        inference_map = {
            "openai": "openai",
            "gemini": "gemini",
            "google_gemini": "gemini",
            "bedrock": "aws_bedrock",
            "aws_bedrock": "aws_bedrock",
            "caii": "caii",
            "openai_compatible": "openai_compatible"
        }
        
        inference_type = inference_map.get(provider_type, provider_type)
        
        # Check credentials based on provider
        if inference_type == "openai" and not os.getenv("OPENAI_API_KEY"):
            return {
                "status": "failed",
                "message": "OpenAI API key not set",
                "error": "Set OPENAI_API_KEY via /set_credentials"
            }
        
        if inference_type == "gemini" and not os.getenv("GEMINI_API_KEY"):
            return {
                "status": "failed",
                "message": "Gemini API key not set",
                "error": "Set GEMINI_API_KEY via /set_credentials"
            }
        
        if inference_type == "caii":
            try:
                _get_caii_token()
            except Exception:
                return {
                    "status": "failed",
                    "message": "CAII token not available",
                    "error": "Set CDP_TOKEN via /set_credentials or ensure /tmp/jwt exists"
                }
            
            if not endpoint_url:
                return {
                    "status": "failed",
                    "message": "CAII requires endpoint_url",
                    "error": "Provide endpoint_url in request"
                }
        
        if inference_type == "openai_compatible":
            if not os.getenv("OpenAI_Endpoint_Compatible_Key"):
                return {
                    "status": "failed",
                    "message": "OpenAI Compatible API key not set",
                    "error": "Set OpenAI_Endpoint_Compatible_Key via /set_credentials"
                }
            
            if not endpoint_url:
                return {
                    "status": "failed",
                    "message": "OpenAI Compatible requires endpoint_url",
                    "error": "Provide endpoint_url in request"
                }
        
        if inference_type == "aws_bedrock":
            if not os.getenv("AWS_ACCESS_KEY_ID") or not os.getenv("AWS_SECRET_ACCESS_KEY"):
                return {
                    "status": "failed",
                    "message": "AWS credentials not set",
                    "error": "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY via /set_credentials"
                }
        
        # Create handler with minimal parameters
        from app.models.request_models import ModelParameters
        
        test_params = ModelParameters(
            temperature=0.0,
            top_p=1.0,
            top_k=1,
            max_tokens=TEST_MAX_TOKENS
        )
        
        handler = UnifiedModelHandler(
            model_id=model_id,
            inference_type=inference_type,
            model_params=test_params,
            caii_endpoint=endpoint_url,
            custom_p=True  # Return raw text
        )
        
        # Run inference with timeout
        response = await asyncio.wait_for(
            asyncio.to_thread(handler.generate_response, TEST_PROMPT, False),
            timeout=10
        )
        
        return {
            "status": "success",
            "message": f"Model '{model_id}' inference successful",
            "provider_type": provider_type,
            "model_id": model_id,
            "test_prompt": TEST_PROMPT,
            "response_preview": response[:50] if response else "No response"
        }
        
    except asyncio.TimeoutError:
        return {
            "status": "failed",
            "message": f"Inference timed out after 10 seconds",
            "provider_type": provider_type,
            "model_id": model_id,
            "error": "Model took too long to respond"
        }
    
    except Exception as e:
        error_msg = str(e)
        
        # Provide helpful error messages
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            return {
                "status": "failed",
                "message": f"Model '{model_id}' not found or not accessible",
                "provider_type": provider_type,
                "model_id": model_id,
                "error": error_msg
            }
        
        if "authentication" in error_msg.lower() or "unauthorized" in error_msg.lower():
            return {
                "status": "failed",
                "message": "Authentication failed",
                "provider_type": provider_type,
                "model_id": model_id,
                "error": "Check your credentials"
            }
        
        if "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
            return {
                "status": "failed",
                "message": "Rate limit or quota exceeded",
                "provider_type": provider_type,
                "model_id": model_id,
                "error": error_msg
            }
        
        return {
            "status": "failed",
            "message": f"Inference failed: {error_msg}",
            "provider_type": provider_type,
            "model_id": model_id,
            "error": error_msg
        }

