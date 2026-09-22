#!/usr/bin/env python3
# coding: utf-8
"""Capture fully-built SIGNED requests from the actual BytePlus Python SDK
(pinned commit e98d2e9) as golden vectors the Node SDK must reproduce
byte-for-byte. Frozen clock + frozen uuid + fixed dummy credentials make the
output deterministic. The request is captured at the REST layer, i.e. after the
interceptor chain has signed it.

Usage:
    BYTEPLUS_PY_SDK=/path/to/byteplus-python-sdk-v2 \\
        python3 packages/core/scripts/gen-request-vectors.py \\
        > packages/core/test/fixtures/request-vectors.json
"""
import os, sys, json, uuid, types
import datetime as dt

sdk = os.environ.get("BYTEPLUS_PY_SDK")
if not sdk:
    sys.exit("set BYTEPLUS_PY_SDK to the byteplus-python-sdk-v2 checkout")
sys.path.insert(0, sdk)

from byteplussdkcore import signv4  # noqa: E402

FIXED = dt.datetime(2025, 7, 1, 12, 34, 56)
FIXED_UUID = uuid.UUID("00000000-0000-4000-8000-000000000000")


class _FakeDT(dt.datetime):
    @classmethod
    def utcnow(cls):
        return FIXED


signv4.datetime = types.SimpleNamespace(datetime=_FakeDT)
uuid.uuid4 = lambda: FIXED_UUID  # X-Sdk-Invocation-Id and RoleSessionName

from byteplussdkcore import rest  # noqa: E402

_cap = {}


class _Stop(Exception):
    pass


def _fake_request(self, method, url, query_params=None, headers=None, body=None,
                  post_params=None, _preload_content=True, _request_timeout=None):
    _cap.clear()
    _cap.update(method=method, url=url,
                query=[list(x) for x in (query_params or [])],
                headers=dict(headers or {}), body=body)
    raise _Stop()


rest.RESTClientObject.request = _fake_request

from byteplussdkcore import Configuration, ApiClient  # noqa: E402

AK = "AKLTtestexampleaccesskey00"
SK = "U0t0ZXN0ZXhhbXBsZXNlY3JldGtleQ=="
REGION = "ap-southeast-1"


def _new_config():
    c = Configuration()
    c.ak, c.sk, c.region = AK, SK, REGION
    return c


def _capture(run):
    try:
        run()
    except _Stop:
        pass
    # rest.py json.dumps the dict body itself; reflect the exact wire bytes.
    body = _cap.get("body")
    wire_body = json.dumps(body) if isinstance(body, (dict, list)) else (body or "")
    return {
        "method": _cap["method"],
        "url": _cap["url"],
        "query": _cap["query"],
        "headers": _cap["headers"],
        "body": wire_body,
    }


vectors = {
    "provenance": {
        "source": "byteplus-python-sdk-v2",
        "commit": "e98d2e9084265c8a7622073ab308cda8da4d4c47",
        "frozen_utc": FIXED.strftime("%Y%m%dT%H%M%SZ"),
        "invocationId": str(FIXED_UUID),
        "roleSessionName": FIXED_UUID.hex,
        "ak": AK, "sk": SK, "region": REGION,
    },
    "cases": {},
}

# --- GetExecution (GET text/plain) ---
from byteplussdkvod20250701.api.vod20250701_api import VOD20250701Api  # noqa: E402
from byteplussdkvod20250701.models.get_execution_request import GetExecutionRequest  # noqa: E402
from byteplussdkvod20250701.models.start_execution_request import StartExecutionRequest  # noqa: E402
from byteplussdkvod20250701.models.input_for_start_execution_input import InputForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.control_for_start_execution_input import ControlForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.operation_for_start_execution_input import OperationForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.task_for_start_execution_input import TaskForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.enhance_for_start_execution_input import EnhanceForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.module_for_start_execution_input import ModuleForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.moe_enhance_for_start_execution_input import MoeEnhanceForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.target_for_start_execution_input import TargetForStartExecutionInput  # noqa: E402
from byteplussdkvod20250701.models.video_strategy_for_start_execution_input import VideoStrategyForStartExecutionInput  # noqa: E402


def _get_execution():
    VOD20250701Api(ApiClient(_new_config())).get_execution(GetExecutionRequest(run_id="r-123"))


def _start_execution():
    req = StartExecutionRequest(input=InputForStartExecutionInput(type="vid", vid="v-123"))
    VOD20250701Api(ApiClient(_new_config())).start_execution(req)


# Deeply-nested StartExecution exercising every input-tree model (incl. list[]).
# Proves nested camelCase->PascalCase renaming at every depth, byte-for-byte.
_NESTED_INPUT = {
    "control": {"clientToken": "ct-1", "priority": 5},
    "input": {"type": "vid", "vid": "v-123"},
    "operation": {
        "type": "Enhance",
        "task": {
            "type": "MoE",
            "enhance": {
                "type": "video",
                "modules": [{"type": "denoise"}, {"type": "sharpen"}],
                "moeEnhance": {
                    "config": "cfg",
                    "target": {"res": "1080p", "resLimit": 1080, "bitrate": 8000, "fps": 29.97, "scaleRatio": 1.5},
                    "videoStrategy": {"repairStrength": 2, "repairStyle": 1},
                },
            },
        },
    },
}


def _start_execution_nested():
    req = StartExecutionRequest(
        control=ControlForStartExecutionInput(client_token="ct-1", priority=5),
        input=InputForStartExecutionInput(type="vid", vid="v-123"),
        operation=OperationForStartExecutionInput(
            type="Enhance",
            task=TaskForStartExecutionInput(
                type="MoE",
                enhance=EnhanceForStartExecutionInput(
                    type="video",
                    modules=[ModuleForStartExecutionInput(type="denoise"), ModuleForStartExecutionInput(type="sharpen")],
                    moe_enhance=MoeEnhanceForStartExecutionInput(
                        config="cfg",
                        target=TargetForStartExecutionInput(res="1080p", res_limit=1080, bitrate=8000, fps=29.97, scale_ratio=1.5),
                        video_strategy=VideoStrategyForStartExecutionInput(repair_strength=2, repair_style=1),
                    ),
                ),
            ),
        ),
    )
    VOD20250701Api(ApiClient(_new_config())).start_execution(req)


vectors["cases"]["getExecution"] = {"input": {"runId": "r-123"}, "expected": _capture(_get_execution)}
vectors["cases"]["startExecution"] = {
    "input": {"input": {"type": "vid", "vid": "v-123"}},
    "expected": _capture(_start_execution),
}
vectors["cases"]["startExecutionNested"] = {
    "input": _NESTED_INPUT,
    "expected": _capture(_start_execution_nested),
}

# --- AssumeRole (STS, signed) ---
from byteplussdkcore.auth.providers.sts_provider import StsCredentialProvider  # noqa: E402


def _assume_role():
    StsCredentialProvider(AK, SK, "myrole", "2100000000").get_credentials()


vectors["cases"]["assumeRole"] = {
    "input": {"roleName": "myrole", "accountId": "2100000000"},
    "expected": _capture(_assume_role),
}

json.dump(vectors, sys.stdout, indent=2, ensure_ascii=False)
sys.stdout.write("\n")
