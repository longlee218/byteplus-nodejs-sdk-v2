import { describe, it, expect } from "vitest";
import { VodV1 } from "../src/index.js";

const sdk = () => new VodV1({ ak: "a", sk: "b", region: "ap-singapore-1" });

describe("Tier-2 faithful-broken methods throw 'no such api' (Python parity)", () => {
  const cases: Array<[string, () => Promise<unknown>]> = [
    ["playback.getPlayInfoWithLiveTimeShiftScene", () => sdk().playback.getPlayInfoWithLiveTimeShiftScene({})],
    ["media.updateMediaStorageClass", () => sdk().media.updateMediaStorageClass({})],
    ["media.getRecommendedPoster", () => sdk().media.getRecommendedPoster({})],
    ["media.createVideoClassification", () => sdk().media.createVideoClassification({})],
    ["media.updateVideoClassification", () => sdk().media.updateVideoClassification({})],
    ["media.deleteVideoClassification", () => sdk().media.deleteVideoClassification({})],
    ["media.listSnapshots", () => sdk().media.listSnapshots({})],
    ["edit.submitDirectEditTaskAsync", () => sdk().edit.submitDirectEditTaskAsync({})],
    ["edit.getDirectEditResult", () => sdk().edit.getDirectEditResult({})],
    ["edit.getDirectEditProgress", () => sdk().edit.getDirectEditProgress({})],
    ["cdn.startDomain", () => sdk().cdn.startDomain({})],
    ["cdn.stopDomain", () => sdk().cdn.stopDomain({})],
    ["cdn.addDomainToScheduler", () => sdk().cdn.addDomainToScheduler({})],
    ["cdn.removeDomainFromScheduler", () => sdk().cdn.removeDomainFromScheduler({})],
    ["cdn.updateDomainPlayRule", () => sdk().cdn.updateDomainPlayRule({})],
    ["cdn.updateDomainExpire", () => sdk().cdn.updateDomainExpire({})],
    ["cdn.addOrUpdateCertificate", () => sdk().cdn.addOrUpdateCertificate({})],
  ];

  it("covers all 17 Tier-2 methods", () => {
    expect(cases).toHaveLength(17);
  });

  it.each(cases)("%s rejects with 'no such api'", async (_name, call) => {
    await expect(call()).rejects.toThrow("no such api");
  });
});

describe("VodV1 facade coverage", () => {
  it("exposes all ten category namespaces", () => {
    const s = sdk();
    for (const ns of ["playback", "drm", "upload", "media", "workflow", "space", "cdn", "callback", "measure", "quality", "edit"] as const) {
      expect(s[ns], ns).toBeDefined();
    }
  });
});
