// Runnable example: use the BytePlus VOD v1 SDK facade.
//
// Credentials come from the environment (never hard-coded). Set:
//   export BYTEPLUS_ACCESSKEY=...   # or BYTEPLUS_ACCESS_KEY
//   export BYTEPLUS_SECRETKEY=...   # or BYTEPLUS_SECRET_KEY
//   export BYTEPLUS_REGION=ap-singapore-1   # optional; ap-singapore-1 | ap-southeast-1
//
// Run it manually (not part of CI) with a TypeScript runner, e.g.:
//   pnpm dlx tsx examples/vod-v1-basic.ts

import { DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodV1 } from "@byteplus-sdk/vod-v1";

async function main(): Promise<void> {
  const vod = new VodV1({
    region: process.env["BYTEPLUS_REGION"] ?? "ap-singapore-1",
    credentialProvider: new DefaultCredentialProvider(),
  });

  // Fetch media info for one or more Vids (comma-separated).
  const infos = await vod.media.getMediaInfos({ Vids: "your-vid-1,your-vid-2" });
  for (const media of infos.Result.MediaInfoList ?? []) {
    console.log(media.BasicInfo?.Vid, media.BasicInfo?.Title, media.BasicInfo?.PublishStatus);
  }

  // Upload a local file end-to-end (ApplyUploadInfo → TOS transfer → CommitUploadInfo).
  // const commit = await vod.upload.uploadMedia({ SpaceName: "your-space", FilePath: "./clip.mp4" });
  // console.log("uploaded vid:", commit.Result.Data?.Vid);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
