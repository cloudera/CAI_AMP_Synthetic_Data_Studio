import pytest
from unittest.mock import patch
import json
from fastapi.testclient import TestClient
from app.main import app, db_manager
client = TestClient(app)

def test_generate_endpoint_with_topics():
    request_data = {
        "use_case": "custom",
        "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        "inference_type": "aws_bedrock",
        "num_questions": 2,
        "topics": ["python_basics"],
        "is_demo": True
    }
    with patch('app.main.SynthesisService.generate_examples') as mock_generate:
        mock_generate.return_value = {
            "status": "completed",
            "export_path": {"local": "test.json"},
            "results": {"python_basics": [{"question": "test?", "solution": "test!"}]}
        }
        response = client.post("/synthesis/generate", json=request_data)
        assert response.status_code == 200
        res_json = response.json()
        assert res_json.get("status") == "completed"
        assert "export_path" in res_json

def test_generate_endpoint_with_doc_paths():
    request_data = {
        "use_case": "custom",
        "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        "inference_type": "aws_bedrock",
        "num_questions": 2,
        "doc_paths": ["test.pdf"],
        "is_demo": True
    }
    with patch('app.main.SynthesisService.generate_examples') as mock_generate:
        mock_generate.return_value = {
            "status": "completed",
            "export_path": {"local": "test.json"},
            "results": {"chunk1": [{"question": "test?", "solution": "test!"}]}
        }
        response = client.post("/synthesis/generate", json=request_data)
        assert response.status_code == 200
        res_json = response.json()
        assert res_json.get("status") == "completed"
        assert "export_path" in res_json

def test_generation_history():
    # Patch db_manager.get_all_generate_metadata to return dummy metadata.
    db_manager.get_all_generate_metadata = lambda: [{"generate_file_name": "qa_pairs_claude_20250210T170521148_test.json", "timestamp": "2024-02-10T12:00:00", "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0"}]
    response = client.get("/generations/history")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json) > 0
    # Instead of expecting exactly "test.json", assert the filename contains "_test.json"
    assert "_test.json" in res_json[0]["generate_file_name"]

def test_error_handling():
    request_data = {
        "use_case": "custom",
        "model_id": "invalid.model",
        "is_demo": True
    }
    response = client.post("/synthesis/generate", json=request_data)
    # Expect an error with status code in [400,503] and key "error"
    assert response.status_code in [400, 503]
    res_json = response.json()
    assert "error" in res_json
