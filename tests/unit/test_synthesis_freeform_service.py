import pytest
from unittest.mock import patch, Mock
import json
from app.services.synthesis_service import SynthesisService
from app.models.request_models import SynthesisRequest
from tests.mocks.mock_db import MockDatabaseManager

@pytest.fixture
def mock_json_data():
    return [{"topic": "test_topic", "example_field": "test_value"}]

@pytest.fixture
def mock_file(tmp_path, mock_json_data):
    file_path = tmp_path / "test.json"
    with open(file_path, "w") as f:
        json.dump(mock_json_data, f)
    return str(file_path)

@pytest.fixture
def synthesis_freeform_service():
    service = SynthesisService()
    service.db = MockDatabaseManager()
    return service

@pytest.mark.asyncio
async def test_generate_freeform_with_topics(synthesis_freeform_service):
    request = SynthesisRequest(
        model_id="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        num_questions=2,
        topics=["test_topic"],
        is_demo=True,
        use_case="custom",
        technique="freeform"
    )
    with patch('app.services.synthesis_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"field1": "value1", "field2": "value2"}]
        result = await synthesis_freeform_service.generate_freeform(request)
        assert result["status"] == "completed"
        assert len(synthesis_freeform_service.db.generation_metadata) == 1
        assert synthesis_freeform_service.db.generation_metadata[0]["model_id"] == request.model_id

@pytest.mark.asyncio
async def test_generate_freeform_with_custom_examples(synthesis_freeform_service):
    request = SynthesisRequest(
        model_id="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        num_questions=1,
        topics=["test_topic"],
        is_demo=True,
        use_case="custom",
        technique="freeform",
        example_custom=[{"example_field": "example_value"}]
    )
    with patch('app.services.synthesis_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"generated_field": "generated_value"}]
        result = await synthesis_freeform_service.generate_freeform(request)
        assert result["status"] == "completed"
        assert "export_path" in result

def test_validate_freeform_item(synthesis_freeform_service):
    # Valid freeform item
    valid_item = {"field1": "value1", "field2": "value2"}
    assert synthesis_freeform_service._validate_freeform_item(valid_item) == True
    
    # Invalid freeform item (empty dict)
    invalid_item = {}
    assert synthesis_freeform_service._validate_freeform_item(invalid_item) == False
    
    # Invalid freeform item (not a dict)
    invalid_item = "not a dict"
    assert synthesis_freeform_service._validate_freeform_item(invalid_item) == False
