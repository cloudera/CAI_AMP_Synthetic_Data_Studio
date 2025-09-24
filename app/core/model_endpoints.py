import os, json, asyncio, requests, boto3, re, datetime as dt
from typing import List, Tuple, Dict
from typing import TypedDict
from botocore.config import Config
from fastapi import APIRouter, HTTPException, status
from app.models.request_models import ModelParameters
from app.core.model_handlers import UnifiedModelHandler
from app.core.config import _get_caii_token, caii_check   # already supplied helpers



# ────────────────────────────────────────────────────────────────
# Shared config ─ region + retry config for Bedrock
# ────────────────────────────────────────────────────────────────
_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-west-2"
_RETRY_CFG = Config(region_name=_REGION,
                    retries={"max_attempts": 2, "mode": "standard"})

# Minimum tokens so health checks stay cheap
_MIN_PARAMS = ModelParameters(max_tokens=10, temperature=0, top_p=1, top_k=1)


# ────────────────────────────────────────────────────────────────
# Utils
# ────────────────────────────────────────────────────────────────
def sort_unique_models(models: List[str]) -> List[str]:
    """Drop dups *and* sort newest-looking versions first (crude but works)."""
    def key(name: str) -> Tuple[float, str]:
        base = name.split('.')[-1]
        parts = base.split('-')

        ver = next((p[1:] for p in parts if p.startswith("v") and any(c.isdigit() for c in p)), "0")
        ver = ver.split(':')[0] if ':' in ver else ver
        date = next((p for p in parts if p.isdigit() and len(p) == 8), "00000000")
        return float(ver), date

    seen, out = set(), []
    for m in models:
        base = m.split('.')[-1]
        if base not in seen:
            seen.add(base); out.append(m)
    return sorted(out, key=key, reverse=True)


# ────────────────────────────────────────────────────────────────
# OpenAI helpers
# ────────────────────────────────────────────────────────────────
def list_openai_models() -> List[str]:
    """Return curated list of latest OpenAI text generation models, sorted by release date (newest first)."""
    # Based on research - only most relevant latest text-to-text models
    models = [
        "gpt-4.1",               # Latest GPT-4.1 series (April 2025)
        "gpt-4.1-mini", 
        "gpt-4.1-nano",
        "o3",                    # Latest reasoning models (April 2025) 
        "o4-mini",
        "o3-mini",               # January 2025
        "o1",                    # December 2024
        "gpt-4o",                # November 2024
        "gpt-4o-mini",           # July 2024
        "gpt-4-turbo",           # April 2024
        "gpt-3.5-turbo"          # Legacy but still widely used
    ]
    return models


async def _probe_openai(model_name: str) -> Tuple[str, bool]:
    """Test if OpenAI model responds within timeout."""
    try:
        import openai
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model=model_name,
                messages=[{"role": "user", "content": "Health check"}],
                max_tokens=5
            ),
            timeout=5
        )
        return model_name, True
    except Exception:
        return model_name, False


async def health_openai(models: List[str], concurrency: int = 5) -> Tuple[List[str], List[str]]:
    """Health check OpenAI models with concurrency control."""
    if not os.getenv("OPENAI_API_KEY"):
        return [], models  # All disabled if no API key
        
    sem = asyncio.Semaphore(concurrency)

    async def bound(model: str):
        async with sem:
            return await _probe_openai(model)

    results = await asyncio.gather(*(bound(m) for m in models))
    enabled = [m for m, ok in results if ok]
    disabled = [m for m, ok in results if not ok]
    return enabled, disabled


# ────────────────────────────────────────────────────────────────
# Gemini helpers
# ────────────────────────────────────────────────────────────────
def list_gemini_models() -> List[str]:
    """Return curated list of latest Gemini text generation models, sorted by release date (newest first)."""
    # Based on research - only most relevant latest text-to-text models
    models = [
        "gemini-2.5-pro",           # June 2025 - most powerful thinking model
        "gemini-2.5-flash",         # June 2025 - best price-performance  
        "gemini-2.5-flash-lite",    # June 2025 - cost-efficient
        "gemini-2.0-flash",         # February 2025 - next-gen features
        "gemini-2.0-flash-lite",    # February 2025 - low latency
        "gemini-1.5-pro",           # September 2024 - complex reasoning
        "gemini-1.5-flash",         # September 2024 - fast & versatile
        "gemini-1.5-flash-8b"       # October 2024 - lightweight
    ]
    return models


def _extract_gemini_date(model: str) -> dt.datetime:
    """Extract release date from Gemini model name for sorting."""
    # Gemini models follow pattern: gemini-{version}-{variant}
    if "2.5" in model:
        return dt.datetime(2025, 6, 1)   # June 2025
    elif "2.0" in model:
        return dt.datetime(2025, 2, 1)   # February 2025  
    elif "1.5" in model:
        if "flash-8b" in model:
            return dt.datetime(2024, 10, 1)  # October 2024
        return dt.datetime(2024, 9, 1)   # September 2024
    return dt.datetime.min


async def _probe_gemini(model_name: str) -> Tuple[str, bool]:
    """Test if Gemini model responds within timeout."""
    try:
        from google import genai
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents="Health check"
            ),
            timeout=5
        )
        return model_name, True
    except Exception:
        return model_name, False


async def health_gemini(models: List[str], concurrency: int = 5) -> Tuple[List[str], List[str]]:
    """Health check Gemini models with concurrency control."""
    if not os.getenv("GEMINI_API_KEY"):
        return [], models  # All disabled if no API key
        
    sem = asyncio.Semaphore(concurrency)

    async def bound(model: str):
        async with sem:
            return await _probe_gemini(model)

    results = await asyncio.gather(*(bound(m) for m in models))
    enabled = [m for m, ok in results if ok]
    disabled = [m for m, ok in results if not ok]
    return enabled, disabled


# ────────────────────────────────────────────────────────────────
# Bedrock helpers
# ────────────────────────────────────────────────────────────────
def _bedrock_clients():
    return (
        boto3.client("bedrock", region_name=_REGION,       config=_RETRY_CFG),
        boto3.client("bedrock-runtime", region_name=_REGION, config=_RETRY_CFG),
    )


def list_bedrock_models() -> List[str]:
    client_s = boto3.client("bedrock", region_name=_REGION, config=_RETRY_CFG)
    try:
        resp = client_s.list_foundation_models()
        mod_list = [
            m["modelId"] for m in resp["modelSummaries"]
            if "ON_DEMAND" in m["inferenceTypesSupported"]
            and "TEXT" in m["inputModalities"]
            and "TEXT" in m["outputModalities"]
            and m["providerName"] in ("Anthropic", "Meta", "Mistral AI")
        ]

        # Handle inference profile models
        inference_mod_list = []
        try:
            prof = client_s.list_inference_profiles()
            if "inferenceProfileSummaries" in prof:
                inference_mod_list = [
                    p["inferenceProfileId"]
                    for p in prof["inferenceProfileSummaries"]
                    if any(k in p["inferenceProfileId"].lower()
                           for k in ("meta", "anthropic", "mistral"))
                ]
        except client_s.exceptions.ResourceNotFoundException:
            inference_mod_list = []
        except client_s.exceptions.ValidationException as e:
            print(f"Validation error: {str(e)}")
            inference_mod_list = []
        except client_s.exceptions.AccessDeniedException as e:
            print(f"Access denied: {str(e)}")
            inference_mod_list = []
        except client_s.exceptions.ThrottlingException as e:
            print(f"Request throttled: {str(e)}")
            inference_mod_list = []
        except client_s.exceptions.InternalServerException as e:
            print(f"Bedrock internal error: {str(e)}")
            inference_mod_list = []
        except Exception as e:
            print(f"Unexpected error while getting inference profiles: {str(e)}")
            inference_mod_list = []

        return sort_unique_models(mod_list + inference_mod_list)

    except client_s.exceptions.ValidationException as e:
        print(f"Validation error: {str(e)}")
        raise
    except client_s.exceptions.AccessDeniedException as e:
        print(f"Access denied: {str(e)}")
        raise
    except client_s.exceptions.ThrottlingException as e:
        print(f"Request throttled: {str(e)}")
        raise
    except client_s.exceptions.InternalServerException as e:
        print(f"Bedrock internal error: {str(e)}")
        raise
    except Exception as e:
        print(f"Unexpected error occurred: {str(e)}")
        raise



async def _probe_bedrock(model_id: str, runtime) -> Tuple[str, bool]:
    handler = UnifiedModelHandler(model_id=model_id,
                                  bedrock_client=runtime,
                                  model_params=_MIN_PARAMS)
    try:
        await asyncio.wait_for(
            asyncio.to_thread(handler.generate_response,
                              "Return HEALTHY if you can process this message.",
                              False),
            timeout=5
        )
        return model_id, True
    except Exception:
        return model_id, False


async def health_bedrock(models: List[str],
                         concurrency: int = 10) -> Tuple[List[str], List[str]]:
    _, runtime = _bedrock_clients()
    sem = asyncio.Semaphore(concurrency)

    async def bound(mid: str):
        async with sem:
            return await _probe_bedrock(mid, runtime)

    results = await asyncio.gather(*(bound(m) for m in models))
    enabled = [m for m, ok in results if ok]
    disabled = [m for m, ok in results if not ok]
    return enabled, disabled


# ────────────────────────────────────────────────────────────────
# CAII helpers  (only used on-cluster)
# ────────────────────────────────────────────────────────────────
class _CaiiPair(TypedDict):
    model: str
    endpoint: str


def list_caii_models() -> list[_CaiiPair]:
    """
    Return loaded TEXT_GENERATION endpoints as
    {"model": name, "endpoint": url} dicts.
    """
    import cmlapi, cml.endpoints_v1 as cmlendpoints  # heavy imports only when needed
    api = cmlapi.default_client()
    apps = api.list_ml_serving_apps()

    filt = {"filters": [
        {"key": "task", "value": "TEXT_GENERATION"},
        {"key": "state", "value": "Loaded"},
    ]}
    _, eps = cmlendpoints.list_endpoints(apps, filt)

    return [{"model": e["model_name"], "endpoint": e["url"]} for e in eps]


async def _probe_caii(pair: _CaiiPair) -> tuple[_CaiiPair, bool]:
    try:
        await asyncio.to_thread(caii_check, pair["endpoint"], 3)
        return pair, True
    except HTTPException:
        return pair, False


async def health_caii(pairs: list[_CaiiPair],
                      concurrency: int = 5) -> tuple[list[_CaiiPair], list[_CaiiPair]]:
    sem = asyncio.Semaphore(concurrency)

    async def bound(p: _CaiiPair):
        async with sem:
            return await _probe_caii(p)

    results = await asyncio.gather(*(bound(p) for p in pairs))
    enabled = [p for p, ok in results if ok]
    disabled = [p for p, ok in results if not ok]
    return enabled, disabled


# ────────────────────────────────────────────────────────────────
# Single orchestrator used by the api endpoint
# ────────────────────────────────────────────────────────────────
async def collect_model_catalog() -> Dict[str, Dict[str, List[str]]]:
    """Collect and health-check models from all providers, including custom endpoints."""
    
    # Import here to avoid circular imports
    from app.core.custom_endpoint_manager import CustomEndpointManager
    
    # Bedrock
    bedrock_all = list_bedrock_models()
    bedrock_enabled, bedrock_disabled = await health_bedrock(bedrock_all)

    # OpenAI  
    openai_all = list_openai_models()
    openai_enabled, openai_disabled = await health_openai(openai_all)

    # Gemini
    gemini_all = list_gemini_models() 
    gemini_enabled, gemini_disabled = await health_gemini(gemini_all)

    catalog: Dict[str, Dict[str, List[str]]] = {
        "aws_bedrock": {
            "enabled": bedrock_enabled,
            "disabled": bedrock_disabled,
        },
        "openai": {
            "enabled": openai_enabled,
            "disabled": openai_disabled,
        },
        "google_gemini": {
            "enabled": gemini_enabled,
            "disabled": gemini_disabled,
        },
        "openai_compatible": {
            "enabled": [],
            "disabled": [],
        }
    }

    # CAII (only on-cluster)
    if os.getenv("CDSW_PROJECT_ID", "local") != "local":
        caii_all = list_caii_models()
        caii_enabled, caii_disabled = await health_caii(caii_all)
        catalog["CAII"] = {
            "enabled": caii_enabled,      # list[{"model":…, "endpoint":…}]
            "disabled": caii_disabled,
        }
    else:
        catalog["CAII"] = {}

    # Add custom endpoints
    try:
        custom_manager = CustomEndpointManager()
        custom_endpoints = custom_manager.get_all_endpoints()
        
        for endpoint in custom_endpoints:
            provider_key = _get_catalog_key_for_provider(endpoint.provider_type)
            
            if provider_key not in catalog:
                catalog[provider_key] = {"enabled": [], "disabled": []}
            
            # For now, assume custom endpoints are enabled (we could add health checks later)
            if endpoint.provider_type in ["caii"]:
                # CAII format: {"model": name, "endpoint": url}
                catalog[provider_key]["enabled"].append({
                    "model": endpoint.model_id,
                    "endpoint": getattr(endpoint, 'endpoint_url', ''),
                    "custom": True,
                    "endpoint_id": endpoint.endpoint_id,
                    "display_name": endpoint.display_name
                })
            else:
                # Other providers: just the model name with custom metadata
                catalog[provider_key]["enabled"].append({
                    "model": endpoint.model_id,
                    "custom": True,
                    "endpoint_id": endpoint.endpoint_id,
                    "display_name": endpoint.display_name,
                    "provider_type": endpoint.provider_type
                })
                
    except Exception as e:
        print(f"Warning: Failed to load custom endpoints: {e}")

    return catalog


def _get_catalog_key_for_provider(provider_type: str) -> str:
    """Map provider types to catalog keys"""
    mapping = {
        "bedrock": "aws_bedrock",
        "openai": "openai", 
        "openai_compatible": "openai_compatible",
        "gemini": "google_gemini",
        "caii": "CAII"
    }
    return mapping.get(provider_type, provider_type)

