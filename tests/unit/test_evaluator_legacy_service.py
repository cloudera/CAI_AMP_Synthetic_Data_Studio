import pytest
from io import StringIO
from unittest.mock import patch
import json
from app.services.evaluator_legacy_service import EvaluatorLegacyService
from app.models.request_models import EvaluationRequest
from tests.mocks.mock_db import MockDatabaseManager
from app.core.exceptions import ModelHandlerError, APIError

@pytest.fixture
def mock_qa_data():
    return [{"question": "test question?", "solution": "test solution"}]

@pytest.fixture
def mock_qa_file(tmp_path, mock_qa_data):
    file_path = tmp_path / "qa_pairs.json"
    with open(file_path, "w") as f:
        json.dump(mock_qa_data, f)
    return str(file_path)

@pytest.fixture
def evaluator_service():
    service = EvaluatorLegacyService()
    service.db = MockDatabaseManager()
    return service

def test_evaluate_results(evaluator_service, mock_qa_file):
    request = EvaluationRequest(
        model_id="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        use_case="custom",
        import_path=mock_qa_file,
        is_demo=True,
        output_key="Prompt",
        output_value="Completion"
    )
    with patch('app.services.evaluator_legacy_service.create_handler') as mock_handler:
        mock_handler.return_value.generate_response.return_value = [{"score": 4, "justification": "Good answer"}]
        result = evaluator_service.evaluate_results(request)
        assert result["status"] == "completed"
        assert "output_path" in result
        assert len(evaluator_service.db.evaluation_metadata) == 1

def test_evaluate_single_pair():
    with patch('app.services.evaluator_legacy_service.create_handler') as mock_handler:
        mock_response = [{"score": 4, "justification": "Good explanation"}]
        mock_handler.return_value.generate_response.return_value = mock_response
        service = EvaluatorLegacyService()
        qa_pair = {"Prompt": "What is Python?", "Completion": "Python is a programming language"}
        request = EvaluationRequest(
            use_case="custom",
            model_id="test.model",
            inference_type="aws_bedrock",
            is_demo=True,
            output_key="Prompt",
            output_value="Completion"
        )
        result = service.evaluate_single_pair(qa_pair, mock_handler.return_value, request)
        assert result["evaluation"]["score"] == 4
        assert "justification" in result["evaluation"]

def test_evaluate_results_with_error():
    fake_json = '[{"Seeds": "python_basics", "Prompt": "What is Python?", "Completion": "Python is a programming language"}]'
    class DummyHandler:
        def generate_response(self, prompt, **kwargs):  # Accept any keyword arguments
            raise ModelHandlerError("Test error")
    with patch('app.services.evaluator_legacy_service.os.path.exists', return_value=True), \
         patch('builtins.open', new=lambda f, mode, *args, **kwargs: StringIO(fake_json)), \
         patch('app.services.evaluator_legacy_service.create_handler', return_value=DummyHandler()), \
         patch('app.services.evaluator_legacy_service.PromptBuilder.build_eval_prompt', return_value="dummy prompt"):
        service = EvaluatorLegacyService()
        request = EvaluationRequest(
            use_case="custom",
            model_id="test.model",
            inference_type="aws_bedrock",
            import_path="test.json",
            is_demo=True,
            output_key="Prompt",
            output_value="Completion",
            caii_endpoint="dummy_endpoint",
            display_name="dummy"
        )
        with pytest.raises(APIError, match="Test error"):
            service.evaluate_results(request)
