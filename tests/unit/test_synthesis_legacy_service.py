import pytest
from unittest.mock import patch, Mock
import json
from app.services.synthesis_legacy_service import SynthesisLegacyService
from app.models.request_models import SynthesisRequest
from tests.mocks.mock_db import MockDatabaseManager

@pytest.fixture
def mock_json_data():
    return [{"input": "test question?"}]

@pytest.fixture
def mock_file(tmp_path, mock_json_data):
    file_path = tmp_path / "test.json"
    with open(file_path, "w") as f:
        json.dump(mock_json_data, f)
    return str(file_path)

@pytest.fixture
def synthesis_service():
    service = SynthesisLegacyService()
    service.db = MockDatabaseManager()
    return service

@pytest.mark.asyncio
async def test_generate_examples_with_topics(synthesis_service):
    request = SynthesisRequest(
        model_id="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        num_questions=1,
        topics=["test_topic"],
        is_demo=True,
        use_case="custom"
    )
    with patch('app.services.synthesis_legacy_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"question": "test?", "solution": "test!"}]
        result = await synthesis_service.generate_examples(request)
        assert result["status"] == "completed"
        assert len(synthesis_service.db.generation_metadata) == 1
        assert synthesis_service.db.generation_metadata[0]["model_id"] == request.model_id

@pytest.mark.asyncio
async def test_generate_examples_with_doc_paths(synthesis_service, mock_file):
    request = SynthesisRequest(
        model_id="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        num_questions=1,
        doc_paths=[mock_file],
        is_demo=True,
        use_case="custom"
    )
    with patch('app.services.synthesis_legacy_service.create_handler') as mock_handler, \
         patch('app.services.synthesis_legacy_service.DocumentProcessor') as mock_processor:
        mock_processor.return_value.process_document.return_value = ["chunk1"]
        mock_handler.return_value.generate_response.return_value = [{"question": "test?", "solution": "test!"}]
        result = await synthesis_service.generate_examples(request)
        assert result["status"] == "completed"
        assert len(synthesis_service.db.generation_metadata) == 1
