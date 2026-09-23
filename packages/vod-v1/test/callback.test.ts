import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodCallbackV1 } from "../src/index.js";

const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
const rec = () => {
  const box: { req?: HttpRequest } = {};
  const http = async (req: HttpRequest): Promise<HttpResponse> => {
    box.req = req;
    return { status: 200, headers: {}, body: '{"ResponseMetadata":{"Error":{"Code":""}}}' };
  };
  return { box, http };
};
const cb = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodCallbackV1(new VodV1Client({ ak: "AKTESTFIXTURE", sk: "SKTESTFIXTURE", region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodCallbackV1", () => {
  it("addCallbackSubscription hits AddCallbackSubscription with the fields in the query", async () => {
    const { box, http } = rec();
    await cb(http).addCallbackSubscription({ SpaceName: "s", Url: "https://cb/x", ContentType: "application/json" });
    expect(query(box.req!.url)).toMatchObject({
      Action: "AddCallbackSubscription",
      SpaceName: "s",
      Url: "https://cb/x",
    });
  });

  it("setCallbackEvent hits SetCallbackEvent", async () => {
    const { box, http } = rec();
    await cb(http).setCallbackEvent({ SpaceName: "s", Events: "Upload,Transcode", AuthEnabled: "true" });
    expect(query(box.req!.url)).toMatchObject({ Action: "SetCallbackEvent", Events: "Upload,Transcode" });
  });

  it("VodV1 facade exposes callback", () => {
    const sdk = new VodV1({ ak: "a", sk: "b", region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.callback).toBeInstanceOf(VodCallbackV1);
  });
});
