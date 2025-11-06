import pytest
from unittest.mock import patch, Mock
import json
from app.services.evaluator_service import EvaluatorService
from app.models.request_models import EvaluationRequest
from tests.mocks.mock_db import MockDatabaseManager

@pytest.fixture
def mock_freeform_data():
    return [{"field1": "value1", "field2": "value2", "field3": "value3"}]

@pytest.fixture
def mock_freeform_file(tmp_path, mock_freeform_data):
    file_path = tmp_path / "freeform_data.json"
    with open(file_path, "w") as f:
        json.dump(mock_freeform_data, f)
    return str(file_path)

@pytest.fixture
def evaluator_freeform_service():
    service = EvaluatorService()
    service.db = MockDatabaseManager()
    return service

def test_evaluate_row_data(evaluator_freeform_service, mock_freeform_file):
    request = EvaluationRequest(
        model_id="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        use_case="custom",
        import_path=mock_freeform_file,
        is_demo=True,
        output_key="field1",
        output_value="field2"
    )
    with patch('app.services.evaluator_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"score": 4, "justification": "Good freeform data"}]
        result = evaluator_freeform_service.evaluate_row_data(request)
        assert result["status"] == "completed"
        assert "output_path" in result
        assert len(evaluator_freeform_service.db.evaluation_metadata) == 1

def test_evaluate_single_row(evaluator_freeform_service):
    with patch('app.services.evaluator_service.create_handler') as mock_handler:
        mock_response = [{"score": 4, "justification": "Good freeform row"}]
        mock_handler.return_value.generate_response.return_value = mock_response
        
        row = {"field1": "value1", "field2": "value2"}
        request = EvaluationRequest(
            use_case="custom",
            model_id="test.model",
            inference_type="aws_bedrock",
            is_demo=True,
            output_key="field1",
            output_value="field2"
        )
        result = evaluator_freeform_service.evaluate_single_row(row, mock_handler.return_value, request)
        assert result["evaluation"]["score"] == 4
        assert "justification" in result["evaluation"]
        assert result["row"] == row

def test_evaluate_rows(evaluator_freeform_service):
    rows = [
        {"field1": "value1", "field2": "value2"},
        {"field1": "value3", "field2": "value4"}
    ]
    request = EvaluationRequest(
        use_case="custom",
        model_id="test.model",
        inference_type="aws_bedrock",
        is_demo=True,
        output_key="field1",
        output_value="field2"
    )
    
    with patch('app.services.evaluator_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"score": 4, "justification": "Good row"}]
        result = evaluator_freeform_service.evaluate_rows(rows, mock_handler.return_value, request)
        
        assert result["total_evaluated"] == 2
        assert result["average_score"] == 4
        assert len(result["evaluated_rows"]) == 2
