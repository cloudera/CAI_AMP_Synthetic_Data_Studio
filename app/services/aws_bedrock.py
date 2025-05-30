import json
import os
from typing import Optional
import boto3
from botocore.config import Config

from app.core.exceptions import APIError  # Change this line

from dotenv import load_dotenv
load_dotenv() 



def get_bedrock_client():
    
    region = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION"))
    new_target_region = "us-west-2"
    retry_config = Config(
        region_name=new_target_region,
        retries={
            "max_attempts": 2,
            "mode": "standard",
        },
        connect_timeout=5,
        read_timeout=3600
    )
    bedrock_client = boto3.client(service_name="bedrock-runtime", region_name=region, config=retry_config)

  
    
    print("boto3 Bedrock client successfully created!")
    print(bedrock_client._endpoint)
    return bedrock_client



