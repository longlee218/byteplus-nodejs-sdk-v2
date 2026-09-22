#!/usr/bin/env python3
# coding: utf-8
"""Generate byte-identical SignatureV4 reference vectors from the BytePlus
Python SDK (pinned commit e98d2e9). The emitted JSON is the ground truth the
TypeScript signer must reproduce.

Usage:
    BYTEPLUS_PY_SDK=/path/to/byteplus-python-sdk-v2 \\
        python3 packages/core/scripts/gen-sign-vectors.py \\
        > packages/core/test/fixtures/sign-vectors.json

The clock is frozen so output is deterministic. Intermediates (canonical
request, string to sign, signature) are captured from the signer's own
debug_sign hook, so they are exactly what the reference computes.
"""
import copy
import datetime as _dt
import json
import os
import sys
import types

sdk_path = os.environ.get("BYTEPLUS_PY_SDK")
if not sdk_path:
    sys.exit("set BYTEPLUS_PY_SDK to the byteplus-python-sdk-v2 checkout")
sys.path.insert(0, sdk_path)

from byteplussdkcore import signv4  # noqa: E402
from byteplussdkcore.observability.debugger import sdk_core_logger  # noqa: E402
from six.moves.urllib.parse import quote  # noqa: E402

FIXED = _dt.datetime(2025, 7, 1, 12, 34, 56)


class _FakeDT(_dt.datetime):
    @classmethod
    def utcnow(cls):
        return FIXED


# Freeze the clock the signer reads (signv4 does `datetime.datetime.utcnow()`).
signv4.datetime = types.SimpleNamespace(datetime=_FakeDT)

# Capture the signer's own debug output for the intermediates.
_captured = {}


def _capture(fmt, *args):
    if "canonical_request:" in fmt:
        _captured["canonical_request"] = args[0]
    elif "string_to_sign:" in fmt:
        _captured["string_to_sign"] = args[0]
    elif fmt.startswith("calculated signature"):
        _captured["signature"] = args[0]


sdk_core_logger.debug_sign = _capture

AK = "AKLTtestexampleaccesskey00"
SK = "U0t0ZXN0ZXhhbXBsZXNlY3JldGtleQ=="
REGION = "ap-southeast-1"
SERVICE = "vod"

# Each case: name + kwargs for SignerV4.sign. headers/query/post_params are
# copied per-run because sign() mutates headers.
SIGN_CASES = [
    {
        "name": "get-no-body",
        "path": "/", "method": "GET", "headers": {}, "body": "",
        "post_params": [], "query": {"Action": "GetExecution", "Version": "2025-07-01"},
        "session_token": None,
    },
    {
        "name": "post-json-body",
        "path": "/", "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"RunId": "r-123", "N": 1}),
        "post_params": [], "query": {"Action": "StartExecution", "Version": "2025-07-01"},
        "session_token": None,
    },
    {
        "name": "post-form-params",
        "path": "/", "method": "POST",
        "headers": {"Content-Type": "application/x-www-form-urlencoded"},
        "body": "",
        "post_params": [("A", "1"), ("B", "two words"), ("C", "x/y")],
        "query": {"Action": "DoThing", "Version": "2020-01-01"},
        "session_token": None,
    },
    {
        "name": "with-session-token",
        "path": "/", "method": "GET", "headers": {}, "body": "",
        "post_params": [], "query": {"Action": "GetExecution", "Version": "2025-07-01"},
        "session_token": "STStokenexamplevalue",
    },
    {
        "name": "host-port-stripped",
        "path": "/", "method": "GET",
        "headers": {"Host": "open.byteplusapi.com:443"}, "body": "",
        "post_params": [], "query": {"Action": "GetExecution"},
        "session_token": None,
    },
    {
        "name": "query-encoding-and-sort",
        "path": "/", "method": "GET", "headers": {}, "body": "",
        "post_params": [],
        "query": {"z": "a b", "a": "sp ace", "m": "x/y~z", "Action": "Q"},
        "session_token": None,
    },
    {
        "name": "multiple-x-headers",
        "path": "/", "method": "POST",
        "headers": {"Content-Type": "application/json", "X-Foo": "foo",
                    "X-Bar": "bar", "X-Aaa": "aaa"},
        "body": json.dumps({"k": "v"}),
        "post_params": [], "query": {"Action": "StartExecution"},
        "session_token": None,
    },
    {
        "name": "empty-path-normalized",
        "path": "", "method": "GET", "headers": {}, "body": "",
        "post_params": [], "query": {"Action": "GetExecution"},
        "session_token": None,
    },
    {
        "name": "content-md5-signed",
        "path": "/", "method": "POST",
        "headers": {"Content-Type": "application/json",
                    "Content-Md5": "1B2M2Y8AsgTpgAmY7PhCfg=="},
        "body": json.dumps({"k": "v"}),
        "post_params": [], "query": {"Action": "StartExecution"},
        "session_token": None,
    },
]

# Standalone encoding vectors (Python quote(safe='-_.~') and canonical_query).
PCT_CASES = ["a b", "x/y", "tilde~ok", "café", "A-_.~z", "100%", "a=b&c"]
CANONICAL_QUERY_CASES = [
    {"z": "a b", "a": "sp ace", "m": "x/y~z"},
    {"Action": "Q", "b": "1", "a": "2"},
]

SIGN_URL_CASES = [
    {
        "name": "presign-with-host",
        "path": "/", "method": "GET",
        "query": {"Action": "GetExecution", "Version": "2025-07-01"},
        "host": "open.byteplusapi.com", "session_token": None,
    },
    {
        "name": "presign-no-host",
        "path": "/", "method": "GET",
        "query": {"Action": "GetExecution", "Version": "2025-07-01"},
        "host": None, "session_token": None,
    },
    {
        "name": "presign-with-token",
        "path": "/", "method": "GET",
        "query": {"Action": "GetExecution"},
        "host": "open.byteplusapi.com", "session_token": "STStokenpresign",
    },
]

out = {
    "provenance": {
        "source": "byteplus-python-sdk-v2",
        "commit": "e98d2e9084265c8a7622073ab308cda8da4d4c47",
        "frozen_utc": FIXED.strftime("%Y%m%dT%H%M%SZ"),
        "ak": AK, "sk": SK, "region": REGION, "service": SERVICE,
        # Signing key intermediate for date8 of frozen_utc, region, service.
        "signingKeyHex": signv4.SignerV4.get_signing_secret_key_v4(
            SK, FIXED.strftime("%Y%m%d"), REGION, SERVICE
        ).hex(),
    },
    "pctEncode": [{"input": s, "expected": quote(s, safe="-_.~")} for s in PCT_CASES],
    "canonicalQuery": [
        {"input": q, "expected": signv4.SignerV4.canonical_query(dict(q))}
        for q in CANONICAL_QUERY_CASES
    ],
    "sign": [],
    "signUrl": [],
}

for c in SIGN_CASES:
    _captured.clear()
    headers = copy.deepcopy(c["headers"])
    signv4.SignerV4.sign(
        c["path"], c["method"], headers, c["body"],
        list(c["post_params"]), dict(c["query"]),
        AK, SK, REGION, SERVICE, session_token=c["session_token"],
    )
    out["sign"].append({
        "name": c["name"],
        "input": {
            "path": c["path"], "method": c["method"],
            "headers": c["headers"], "body": c["body"],
            "postParams": c["post_params"], "query": c["query"],
            "sessionToken": c["session_token"],
        },
        "expected": {
            "headers": headers,
            "canonicalRequest": _captured.get("canonical_request"),
            "stringToSign": _captured.get("string_to_sign"),
            "signature": _captured.get("signature"),
        },
    })

for c in SIGN_URL_CASES:
    qs = signv4.SignerV4.sign_url(
        c["path"], c["method"], dict(c["query"]),
        AK, SK, REGION, SERVICE,
        session_token=c["session_token"], host=c["host"],
    )
    out["signUrl"].append({
        "name": c["name"],
        "input": {
            "path": c["path"], "method": c["method"], "query": c["query"],
            "host": c["host"], "sessionToken": c["session_token"],
        },
        "expected": {"queryString": qs},
    })

json.dump(out, sys.stdout, indent=2, ensure_ascii=False)
sys.stdout.write("\n")
