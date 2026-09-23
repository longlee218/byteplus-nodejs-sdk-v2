import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodWorkflowV1 } from "../src/index.js";

const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
const rec = (body: string) => {
  const box: { req?: HttpRequest } = {};
  const http = async (req: HttpRequest): Promise<HttpResponse> => {
    box.req = req;
    return { status: 200, headers: {}, body };
  };
  return { box, http };
};
const wf = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodWorkflowV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodWorkflowV1", () => {
  it("startWorkflow JSON-encodes the nested Input and signs it like Python", async () => {
    const { box, http } = rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"RunId":"run-1"}}');
    const resp = await wf(http).startWorkflow({ Vid: "v-1", TemplateId: "tpl-1", Input: { Condition: { x: true } } });

    expect(query(box.req!.url)["Input"]).toBe('{"Condition": {"x": true}}');
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=host;x-content-sha256;x-date, " +
        "Signature=5d9e8d3029ffd96454b3303d27871b511af5728e1f9ca79c082a593e7a75492e",
    );
    expect(resp.Result.RunId).toBe("run-1");
  });

  it("retrieveTranscodeResult parses the inspection/quality tree", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { Vid: "v-1", Inspection: { Quality: { Visual: { VQScore: 88.5 } } }, CategoryTags: [{ TagName: "sport", Prob: 0.9 }] },
    });
    const resp = await wf(rec(canned).http).retrieveTranscodeResult({ Vid: "v-1", ResultType: "Inspection" });
    expect(resp.Result.Inspection?.Quality?.Visual?.VQScore).toBe(88.5);
    expect(resp.Result.CategoryTags?.[0]?.TagName).toBe("sport");
  });

  it("getWorkflowExecution hits GetWorkflowExecution and parses execution status", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { RunId: "run-1", Status: "Success", TasksDetail: [{ DisplayName: "Transcode", Progress: 100 }] },
    });
    const { box, http } = rec(canned);
    const resp = await wf(http).getWorkflowExecution({ RunId: "run-1", NeedTasksDetail: "true" });
    expect(query(box.req!.url)["Action"]).toBe("GetWorkflowExecution");
    expect(resp.Result.Status).toBe("Success");
    expect(resp.Result.TasksDetail?.[0]?.Progress).toBe(100);
  });

  it("VodV1 facade exposes workflow", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.workflow).toBeInstanceOf(VodWorkflowV1);
  });
});
