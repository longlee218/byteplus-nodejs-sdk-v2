import { describe, it, expect } from "vitest";
import { VOD_V1_API_INFO, VOD_V1_OP_COUNT } from "../src/index.js";

describe("v1 api-info table", () => {
  it("has exactly the 60 wired operations", () => {
    expect(VOD_V1_OP_COUNT).toBe(60);
  });

  it("preserves the ListCdnTasks -> ListCDNTasks wire-Action rename", () => {
    expect(VOD_V1_API_INFO.ListCdnTasks?.action).toBe("ListCDNTasks");
  });

  it("carries per-operation versions", () => {
    expect(VOD_V1_API_INFO.GetPlayInfo?.version).toBe("2023-01-01");
    expect(VOD_V1_API_INFO.GetFileInfos?.version).toBe("2023-07-01");
    expect(VOD_V1_API_INFO.GetSpaceDetail?.version).toBe("2023-07-01");
    expect(VOD_V1_API_INFO.GetVodMediaPlayData?.version).toBe("2025-04-01");
  });

  it("marks the POST ops with their body encoding", () => {
    expect(VOD_V1_API_INFO.UploadMediaByUrl).toMatchObject({ method: "POST", dispatch: "postForm" });
    expect(VOD_V1_API_INFO.ParseUploadManifest).toMatchObject({ method: "POST", dispatch: "postForm" });
    expect(VOD_V1_API_INFO.DeleteMediaTosFile).toMatchObject({ method: "POST", dispatch: "postForm" });
    expect(VOD_V1_API_INFO.ListFileMetaInfosByFileNames).toMatchObject({ method: "POST", dispatch: "postForm" });
    expect(VOD_V1_API_INFO.GetVodMediaPlayData).toMatchObject({ method: "POST", dispatch: "postJson" });
    expect(VOD_V1_API_INFO.GetDrmLicense).toMatchObject({ method: "POST", dispatch: "postJson" });
  });

  it("every entry has path-agnostic method GET or POST", () => {
    for (const [name, e] of Object.entries(VOD_V1_API_INFO)) {
      expect(["GET", "POST"], name).toContain(e.method);
      expect(e.action.length, name).toBeGreaterThan(0);
      expect(e.version, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
