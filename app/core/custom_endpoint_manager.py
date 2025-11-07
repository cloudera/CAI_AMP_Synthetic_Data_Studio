import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from pathlib import Path

from app.models.request_models import (
    CustomEndpoint, CustomCAIIEndpoint, CustomBedrockEndpoint,
    CustomOpenAIEndpoint, CustomOpenAICompatibleEndpoint, CustomGeminiEndpoint
)
from app.core.exceptions import APIError


class CustomEndpointManager:
    """Manager for custom model endpoints - simplified"""
    
    def __init__(self, config_file: str = "custom_model_endpoints.json"):
        """
        Initialize the custom endpoint manager
        
        Args:
            config_file: Path to the JSON file storing custom endpoints
        """
        self.config_file = Path(config_file)
        self._ensure_config_file_exists()
    
    def _ensure_config_file_exists(self):
        """Ensure the configuration file exists with proper structure"""
        if not self.config_file.exists():
            initial_config = {
                "version": "1.0",
                "endpoints": {}
            }
            with open(self.config_file, 'w') as f:
                json.dump(initial_config, f, indent=2)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            raise APIError(f"Failed to load custom endpoints configuration: {str(e)}", 500)
    
    def _save_config(self, config: Dict[str, Any]):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            raise APIError(f"Failed to save custom endpoints configuration: {str(e)}", 500)
    
    def add_endpoint(self, endpoint: CustomEndpoint) -> str:
        """
        Add a new custom endpoint
        
        Args:
            endpoint: Custom endpoint configuration
            
        Returns:
            unique_key: The unique key for the added endpoint (model_id:provider_type)
            
        Raises:
            APIError: If endpoint already exists or validation fails
        """
        config = self._load_config()
        
        # Use model_id + provider_type as unique key
        unique_key = f"{endpoint.model_id}:{endpoint.provider_type}"
        
        # Check if endpoint already exists
        if unique_key in config["endpoints"]:
            raise APIError(f"Endpoint for model '{endpoint.model_id}' with provider '{endpoint.provider_type}' already exists", 400)
        
        # Store endpoint configuration
        config["endpoints"][unique_key] = endpoint.model_dump()
        
        self._save_config(config)
        return unique_key
    
    def get_endpoint(self, model_id: str, provider_type: str) -> Optional[CustomEndpoint]:
        """
        Get a specific custom endpoint by model_id and provider_type
        
        Args:
            model_id: The model identifier
            provider_type: The provider type
            
        Returns:
            CustomEndpoint or None if not found
        """
        config = self._load_config()
        unique_key = f"{model_id}:{provider_type}"
        endpoint_data = config["endpoints"].get(unique_key)
        
        if not endpoint_data:
            return None
        
        return self._parse_endpoint(endpoint_data)
    
    def get_all_endpoints(self) -> List[CustomEndpoint]:
        """
        Get all custom endpoints
        
        Returns:
            List of all custom endpoints
        """
        config = self._load_config()
        endpoints = []
        
        for unique_key, endpoint_data in config["endpoints"].items():
            try:
                endpoint = self._parse_endpoint(endpoint_data)
                endpoints.append(endpoint)
            except Exception as e:
                print(f"Warning: Failed to parse endpoint {unique_key}: {e}")
                continue
        
        return endpoints
    
    def get_endpoints_by_provider(self, provider_type: str) -> List[CustomEndpoint]:
        """
        Get all endpoints for a specific provider
        
        Args:
            provider_type: The provider type to filter by
            
        Returns:
            List of endpoints for the specified provider
        """
        all_endpoints = self.get_all_endpoints()
        return [ep for ep in all_endpoints if ep.provider_type == provider_type]
    
    def update_endpoint(self, model_id: str, provider_type: str, updated_endpoint: CustomEndpoint) -> bool:
        """
        Update an existing custom endpoint
        
        Args:
            model_id: The model identifier
            provider_type: The provider type
            updated_endpoint: Updated endpoint configuration
            
        Returns:
            True if updated successfully, False if endpoint not found
            
        Raises:
            APIError: If validation fails
        """
        config = self._load_config()
        
        unique_key = f"{model_id}:{provider_type}"
        
        if unique_key not in config["endpoints"]:
            return False
        
        # Update endpoint configuration
        config["endpoints"][unique_key] = updated_endpoint.model_dump()
        
        self._save_config(config)
        return True
    
    def delete_endpoint(self, model_id: str, provider_type: str) -> bool:
        """
        Delete a custom endpoint
        
        Args:
            model_id: The model identifier
            provider_type: The provider type
            
        Returns:
            True if deleted successfully, False if endpoint not found
        """
        config = self._load_config()
        
        unique_key = f"{model_id}:{provider_type}"
        
        if unique_key not in config["endpoints"]:
            return False
        
        del config["endpoints"][unique_key]
        self._save_config(config)
        return True
    
    def _parse_endpoint(self, endpoint_data: Dict[str, Any]) -> CustomEndpoint:
        """
        Parse endpoint data into appropriate CustomEndpoint subclass
        
        Args:
            endpoint_data: Raw endpoint data from config
            
        Returns:
            Parsed CustomEndpoint instance
            
        Raises:
            APIError: If parsing fails
        """
        provider_type = endpoint_data.get("provider_type")
        
        try:
            if provider_type == "caii":
                return CustomCAIIEndpoint(**endpoint_data)
            elif provider_type == "bedrock":
                return CustomBedrockEndpoint(**endpoint_data)
            elif provider_type == "openai":
                return CustomOpenAIEndpoint(**endpoint_data)
            elif provider_type == "openai_compatible":
                return CustomOpenAICompatibleEndpoint(**endpoint_data)
            elif provider_type == "gemini":
                return CustomGeminiEndpoint(**endpoint_data)
            else:
                raise APIError(f"Unknown provider type: {provider_type}", 400)
        except Exception as e:
            raise APIError(f"Failed to parse endpoint configuration: {str(e)}", 500)
    
    def get_endpoint_stats(self) -> Dict[str, Any]:
        """
        Get statistics about custom endpoints
        
        Returns:
            Dictionary with endpoint statistics
        """
        endpoints = self.get_all_endpoints()
        
        provider_counts = {}
        model_list = []
        for endpoint in endpoints:
            provider_type = endpoint.provider_type
            provider_counts[provider_type] = provider_counts.get(provider_type, 0) + 1
            model_list.append(f"{endpoint.model_id} ({endpoint.provider_type})")
        
        return {
            "total_endpoints": len(endpoints),
            "provider_counts": provider_counts,
            "models": model_list
        }
