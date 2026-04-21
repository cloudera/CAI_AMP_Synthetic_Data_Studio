import pytest
from unittest.mock import Mock, patch
from app.core.model_handlers import UnifiedModelHandler, create_handler
from app.models.request_models import ModelParameters
from app.core.exceptions import InvalidModelError
from botocore.exceptions import ClientError

def test_model_handler_initialization():
    model_id = "test.model"
    handler = UnifiedModelHandler(model_id)
    assert handler.model_id == model_id
    assert handler.model_params == ModelParameters()

@pytest.mark.asyncio
async def test_model_handler_response_parsing():
    handler = UnifiedModelHandler("test.model")
    test_response = '[{"question": "test?", "solution": "test!"}]'
    parsed = handler._extract_json_from_text(test_response)
    assert len(parsed) == 1
    assert parsed[0]["question"] == "test?"

def test_invalid_model_error():
    error_response = {'Error': {'Code': 'ValidationException', 'Message': 'model identifier is invalid'}}
    mock_bedrock_client = Mock()
    mock_bedrock_client.converse.side_effect = ClientError(error_response, 'ConvokeModel')
    handler = UnifiedModelHandler("invalid.model", bedrock_client=mock_bedrock_client)
    with pytest.raises(InvalidModelError):
        handler.generate_response("test", request_id="test_id")


def test_bedrock_converse_prefers_temperature_when_both_sampling_params_are_set():
    mock_bedrock_client = Mock()
    mock_bedrock_client.converse.return_value = {
        "output": {"message": {"content": [{"text": "ok"}]}}
    }
    handler = UnifiedModelHandler(
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        bedrock_client=mock_bedrock_client,
        model_params=ModelParameters(
            temperature=0.3,
            top_p=0.8,
            top_k=10,
            max_tokens=32,
        ),
        custom_p=True,
    )

    handler.generate_response("test", request_id="test_id")

    inference_config = mock_bedrock_client.converse.call_args.kwargs["inferenceConfig"]
    assert inference_config["temperature"] == pytest.approx(0.3)
    assert "topP" not in inference_config


def test_bedrock_converse_uses_top_p_when_temperature_is_default():
    mock_bedrock_client = Mock()
    mock_bedrock_client.converse.return_value = {
        "output": {"message": {"content": [{"text": "ok"}]}}
    }
    handler = UnifiedModelHandler(
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        bedrock_client=mock_bedrock_client,
        model_params=ModelParameters(
            temperature=0.0,
            top_p=0.8,
            top_k=10,
            max_tokens=32,
        ),
        custom_p=True,
    )

    handler.generate_response("test", request_id="test_id")

    inference_config = mock_bedrock_client.converse.call_args.kwargs["inferenceConfig"]
    assert inference_config["topP"] == pytest.approx(0.8)
    assert "temperature" not in inference_config
