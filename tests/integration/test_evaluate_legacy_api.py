import pytest
from unittest.mock import patch, Mock
import json
from fastapi.testclient import TestClient
from pathlib import Path
from app.main import app, db_manager, evaluator_legacy_service  # global instance created on import
client = TestClient(app)

# Create a dummy bedrock client that simulates the Converse/invoke_model response.
class DummyBedrockClient:
    def invoke_model(self, modelId, body):
        # Return a dummy response structure (adjust if your handler expects a different format)
        return [{
            "score": 1.0,
            "justification": "Dummy response from invoke_model"
        }]
    @property
    def meta(self):
        class Meta:
            region_name = "us-west-2"
        return Meta()

@pytest.fixture
def mock_qa_data():
    return [
        {"Seeds": "python_basics", "Prompt": "What is Python?", "Completion": "Python is a programming language"},
        {"Seeds": "python_basics", "Prompt": "How do you define a function?", "Completion": "Use the def keyword followed by function name"}
    ]

@pytest.fixture
def mock_qa_file(tmp_path, mock_qa_data):
    file_path = tmp_path / "qa_pairs.json"
    with open(file_path, "w") as f:
        json.dump(mock_qa_data, f)
    return str(file_path)

# Patch the global evaluator_service's AWS client before tests run.
@pytest.fixture(autouse=True)
def patch_evaluator_bedrock_client():
    from app.main import evaluator_legacy_service
    evaluator_legacy_service.bedrock_client = DummyBedrockClient()

def test_evaluate_endpoint(mock_qa_file):
    request_data = {
        "use_case": "custom",
        "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        "inference_type": "aws_bedrock",
        "import_path": mock_qa_file,
        "is_demo": True,
        "output_key": "Prompt",
        "output_value": "Completion"
    }
    # Optionally, patch create_handler to return a dummy handler that returns a dummy evaluation.
    with patch('app.services.evaluator_legacy_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"score": 1.0, "justification": "Dummy evaluation"}]
        response = client.post("/synthesis/evaluate", json=request_data)
    # In demo mode, our endpoint returns a dict with "status", "result", and "output_path".
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "completed"
    assert "output_path" in res_json
    assert "result" in res_json

def test_job_handling(mock_qa_file):
    request_data = {
        "use_case": "custom",
        "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        "inference_type": "aws_bedrock",
        "import_path": mock_qa_file,
        "is_demo": True,
        "output_key": "Prompt",
        "output_value": "Completion"
    }
    with patch('app.services.evaluator_legacy_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"score": 1.0, "justification": "Dummy evaluation"}]
        response = client.post("/synthesis/evaluate", json=request_data)
    assert response.status_code == 200
    res_json = response.json()
    # In demo mode, we don't expect a "job_id" key; we check for "output_path" and "result".
    assert "output_path" in res_json
    # Now simulate history by patching db_manager.get_all_evaluate_metadata
    db_manager.get_all_evaluate_metadata = lambda: [{"evaluate_file_name": "test.json", "average_score": 0.9}]
    response = client.get("/evaluations/history")
    assert response.status_code == 200
    history = response.json()
    assert len(history) > 0

def test_evaluate_with_invalid_model(mock_qa_file):
    request_data = {
        "use_case": "custom",
        "model_id": "invalid.model",
        "inference_type": "aws_bedrock",
        "import_path": mock_qa_file,
        "is_demo": True,
        "output_key": "Prompt",
        "output_value": "Completion"
    }
    
    from app.core.exceptions import ModelHandlerError
    
    # Patch create_handler to raise ModelHandlerError
    with patch('app.services.evaluator_service.create_handler') as mock_create:
        mock_create.side_effect = ModelHandlerError("Invalid model identifier: invalid.model")
        response = client.post("/synthesis/evaluate", json=request_data)
        
    # Print for debugging
    print(f"Response status: {response.status_code}")
    print(f"Response content: {response.json()}")
    
    # Expect a 400 or 500 error response
    assert response.status_code in [400, 500]
    res_json = response.json()
    assert "error" in res_json
