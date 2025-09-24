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
    """Manager for custom model endpoints"""
    
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
                "endpoints": {},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_updated": datetime.now(timezone.utc).isoformat()
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
            config["last_updated"] = datetime.now(timezone.utc).isoformat()
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
            endpoint_id: The ID of the added endpoint
            
        Raises:
            APIError: If endpoint already exists or validation fails
        """
        config = self._load_config()
        
        # Check if endpoint_id already exists
        if endpoint.endpoint_id in config["endpoints"]:
            raise APIError(f"Endpoint with ID '{endpoint.endpoint_id}' already exists", 400)
        
        # Add timestamps
        now = datetime.now(timezone.utc).isoformat()
        endpoint.created_at = now
        endpoint.updated_at = now
        
        # Store endpoint configuration
        config["endpoints"][endpoint.endpoint_id] = endpoint.model_dump()
        
        self._save_config(config)
        return endpoint.endpoint_id
    
    def get_endpoint(self, endpoint_id: str) -> Optional[CustomEndpoint]:
        """
        Get a specific custom endpoint by ID
        
        Args:
            endpoint_id: The endpoint ID to retrieve
            
        Returns:
            CustomEndpoint or None if not found
        """
        config = self._load_config()
        endpoint_data = config["endpoints"].get(endpoint_id)
        
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
        
        for endpoint_data in config["endpoints"].values():
            try:
                endpoint = self._parse_endpoint(endpoint_data)
                endpoints.append(endpoint)
            except Exception as e:
                print(f"Warning: Failed to parse endpoint {endpoint_data.get('endpoint_id', 'unknown')}: {e}")
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
    
    def update_endpoint(self, endpoint_id: str, updated_endpoint: CustomEndpoint) -> bool:
        """
        Update an existing custom endpoint
        
        Args:
            endpoint_id: The endpoint ID to update
            updated_endpoint: Updated endpoint configuration
            
        Returns:
            True if updated successfully, False if endpoint not found
            
        Raises:
            APIError: If validation fails
        """
        config = self._load_config()
        
        if endpoint_id not in config["endpoints"]:
            return False
        
        # Preserve original created_at timestamp
        original_created_at = config["endpoints"][endpoint_id].get("created_at")
        
        # Update timestamps
        updated_endpoint.created_at = original_created_at
        updated_endpoint.updated_at = datetime.now(timezone.utc).isoformat()
        updated_endpoint.endpoint_id = endpoint_id  # Ensure ID consistency
        
        # Update endpoint configuration
        config["endpoints"][endpoint_id] = updated_endpoint.model_dump()
        
        self._save_config(config)
        return True
    
    def delete_endpoint(self, endpoint_id: str) -> bool:
        """
        Delete a custom endpoint
        
        Args:
            endpoint_id: The endpoint ID to delete
            
        Returns:
            True if deleted successfully, False if endpoint not found
        """
        config = self._load_config()
        
        if endpoint_id not in config["endpoints"]:
            return False
        
        del config["endpoints"][endpoint_id]
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
    
    def validate_endpoint_id(self, endpoint_id: str) -> bool:
        """
        Validate endpoint ID format
        
        Args:
            endpoint_id: The endpoint ID to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not endpoint_id or not isinstance(endpoint_id, str):
            return False
        
        # Allow alphanumeric, hyphens, and underscores
        import re
        return bool(re.match(r'^[a-zA-Z0-9_-]+$', endpoint_id))
    
    def get_endpoint_stats(self) -> Dict[str, Any]:
        """
        Get statistics about custom endpoints
        
        Returns:
            Dictionary with endpoint statistics
        """
        endpoints = self.get_all_endpoints()
        
        provider_counts = {}
        for endpoint in endpoints:
            provider_type = endpoint.provider_type
            provider_counts[provider_type] = provider_counts.get(provider_type, 0) + 1
        
        return {
            "total_endpoints": len(endpoints),
            "provider_counts": provider_counts,
            "endpoint_ids": [ep.endpoint_id for ep in endpoints]
        }
