import os, json, asyncio, requests, boto3
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
    # Bedrock first
    bedrock_all = list_bedrock_models()
    bedrock_enabled, bedrock_disabled = await health_bedrock(bedrock_all)

    catalog: Dict[str, Dict[str, List[str]]] = {
        "aws_bedrock": {
            "enabled": bedrock_enabled,
            "disabled": bedrock_disabled,
        }
    }

    if os.getenv("CDSW_PROJECT_ID", "local") != "local":
        caii_all = list_caii_models()
        caii_enabled, caii_disabled = await health_caii(caii_all)
        catalog["CAII"] = {
            "enabled": caii_enabled,      # list[{"model":…, "endpoint":…}]
            "disabled": caii_disabled,
        }
    else:
        catalog["CAII"] = {}

    return catalog

