import json
import os
from pathlib import Path
from typing import Dict, Optional, List


class CredentialManager:
    """
    Manages persistent credentials across app restarts.
    
    Credentials are stored in .credentials.env.json and loaded into os.environ
    at startup. This allows credentials to persist across restarts while keeping
    them separate from endpoint metadata.
    """
    
    CREDENTIAL_FILE = Path(".credentials.env.json")
    
    # List of credential keys we manage
    CREDENTIAL_KEYS = [
        "CDP_TOKEN",
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "OpenAI_Endpoint_Compatible_Key",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
       "AWS_REGION"
    ]
    
    @classmethod
    def initialize(cls):
        """
        Initialize credentials at app startup.
        
        If .credentials.env.json exists: Load credentials from file
        If it doesn't exist: Create it from current environment variables
        """
        if cls.CREDENTIAL_FILE.exists():
            print(f"📂 Loading persisted credentials from {cls.CREDENTIAL_FILE}")
            cls._load_from_file()
        else:
            print(f"🆕 First boot: Creating {cls.CREDENTIAL_FILE} from environment variables")
            cls._create_from_environment()
    
    @classmethod
    def _load_from_file(cls):
        """Load credentials from file into os.environ"""
        try:
            with open(cls.CREDENTIAL_FILE) as f:
                credentials = json.load(f)
                
            loaded_count = 0
            
            for key, value in credentials.items():
                if value:  # Only set non-empty values
                    os.environ[key] = value
                    loaded_count += 1
            
            print(f"Loaded {loaded_count} credentials into environment")
            
        except json.JSONDecodeError as e:
            print(f" Warning: Failed to parse {cls.CREDENTIAL_FILE}: {e}")
        except Exception as e:
            print(f"Warning: Failed to load credentials: {e}")
    
    @classmethod
    def _create_from_environment(cls):
        """Create credential file from current environment variables"""
        try:
            # Extract existing values from environment
            initial_creds = {}
            for key in cls.CREDENTIAL_KEYS:
                if value := os.getenv(key):
                    initial_creds[key] = value
            
            # Create the file with initial credentials
            with open(cls.CREDENTIAL_FILE, 'w') as f:
                json.dump(initial_creds, f, indent=2)
            
            print(f"✅ Created {cls.CREDENTIAL_FILE} with {len(initial_creds)} credentials from environment")
            
        except Exception as e:
            print(f"⚠️  Warning: Failed to create credential file: {e}")
    
    @classmethod
    def set_credentials(cls, credentials: Dict[str, str]) -> Dict[str, int]:
        """
        Set one or more credentials - updates both memory and file.
        
        Args:
            credentials: Dictionary of credential key-value pairs
            
        Returns:
            Dictionary with count of updated and new credentials
        """
        # Load existing credentials
        if cls.CREDENTIAL_FILE.exists():
            with open(cls.CREDENTIAL_FILE) as f:
                existing_creds = json.load(f)
        else:
            existing_creds = {}
        
        # Track updates
        updated_count = 0
        new_count = 0
        
        for key, value in credentials.items():
            # Update memory (immediate effect)
            os.environ[key] = value
            
            # Update file
            if key in existing_creds:
                updated_count += 1
            else:
                new_count += 1
            
            existing_creds[key] = value
        
        # Save updated credentials
        with open(cls.CREDENTIAL_FILE, 'w') as f:
            json.dump(existing_creds, f, indent=2)
        
        return {"updated": updated_count, "new": new_count}
    
    @classmethod
    def get_credential(cls, key: str) -> Optional[str]:
        """
        Get a credential from environment.
        
        Args:
            key: Credential key
            
        Returns:
            Credential value or None if not found
        """
        return os.getenv(key)
    
    @classmethod
    def list_available_credentials(cls) -> List[Dict[str, bool]]:
        """
        List all credential keys and whether they are set.
        
        Returns:
            List of dictionaries with key and is_set status
        """
        return [
            {
                "key": key,
                "is_set": bool(os.getenv(key))
            }
            for key in cls.CREDENTIAL_KEYS
        ]
    
