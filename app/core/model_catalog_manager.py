import json
from pathlib import Path
from typing import Dict, List, Any, Union, Optional


class ModelCatalogManager:
    """
    Manages persistent storage of model catalog.
    
    The catalog is saved to a JSON file and only rebuilt when:
    - First startup (file doesn't exist)
    - New endpoint is added via API
    - User explicitly requests refresh
    
    This keeps the catalog stable and allows offline operation.
    """
    
    CATALOG_FILE = Path("model_catalog.json")
    
    @classmethod
    def load_catalog(cls) -> Dict[str, List[Any]]:
        """
        Load model catalog from file.
        
        Returns:
            Model catalog dictionary or empty dict if file doesn't exist
        """
        if not cls.CATALOG_FILE.exists():
            return {}
        
        try:
            with open(cls.CATALOG_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Failed to load model catalog: {e}")
            return {}
    
    @classmethod
    def save_catalog(cls, catalog: Dict[str, List[Any]]):
        """
        Save model catalog to file.
        
        Args:
            catalog: Model catalog dictionary to save
        """
        try:
            with open(cls.CATALOG_FILE, 'w') as f:
                json.dump(catalog, f, indent=2)
            
            print(f"Model catalog saved to {cls.CATALOG_FILE}")
        except Exception as e:
            print(f"Warning: Failed to save model catalog: {e}")
    
    @classmethod
    def catalog_exists(cls) -> bool:
        """Check if catalog file exists"""
        return cls.CATALOG_FILE.exists()
    
    @classmethod
    def add_model_to_catalog(cls, provider_type: str, model_data: Union[str, Dict[str, str]]):
        """
        Add a single model to the catalog.
        
        Args:
            provider_type: Provider type (aws_bedrock, openai, etc.)
            model_data: Model ID string or dict with model/endpoint info
        """
        catalog = cls.load_catalog()
        
        # Initialize provider list if not exists
        if provider_type not in catalog:
            catalog[provider_type] = []
        
        # Add model if not already present
        if isinstance(model_data, dict):
            # Dict format (for CAII/OpenAI compatible): check by model ID
            existing_models = [m.get("model") for m in catalog[provider_type] if isinstance(m, dict)]
            if model_data.get("model") not in existing_models:
                catalog[provider_type].append(model_data)
        else:
            # String model ID (for standard providers)
            if model_data not in catalog[provider_type]:
                catalog[provider_type].append(model_data)
        
        cls.save_catalog(catalog)
    
    @classmethod
    def get_endpoint_url(cls, provider_type: str, model_id: str) -> Optional[str]:
        """
        Get endpoint URL for a model if it has one.
        
        Args:
            provider_type: Provider type
            model_id: Model identifier
            
        Returns:
            Endpoint URL or None
        """
        catalog = cls.load_catalog()
        
        if provider_type not in catalog:
            return None
        
        models = catalog[provider_type]
        
        # For providers that store dicts (CAII, OpenAI compatible)
        for item in models:
            if isinstance(item, dict) and item.get("model") == model_id:
                return item.get("endpoint")
        
        return None
    
    @classmethod
    def remove_model_from_catalog(cls, provider_type: str, model_id: str) -> bool:
        """
        Remove a model from the catalog.
        
        Args:
            provider_type: Provider type
            model_id: Model identifier
            
        Returns:
            True if removed, False if not found
        """
        catalog = cls.load_catalog()
        
        if provider_type not in catalog:
            return False
        
        models = catalog[provider_type]
        
        # Find and remove the model
        for i, item in enumerate(models):
            if isinstance(item, dict):
                if item.get("model") == model_id:
                    catalog[provider_type].pop(i)
                    cls.save_catalog(catalog)
                    return True
            elif item == model_id:
                catalog[provider_type].pop(i)
                cls.save_catalog(catalog)
                return True
        
        return False
    
    @classmethod
    def get_catalog_summary(cls) -> Dict[str, int]:
        """
        Get summary statistics about the catalog.
        
        Returns:
            Dictionary with provider names and model counts
        """
        catalog = cls.load_catalog()
        return {
            provider: len(models)
            for provider, models in catalog.items()
        }

