// Runnable example: start a VOD execution and poll it until it finishes.
//
// Credentials come from the environment (never hard-coded). Set:
//   export BYTEPLUS_ACCESSKEY=...   # or BYTEPLUS_ACCESS_KEY
//   export BYTEPLUS_SECRETKEY=...   # or BYTEPLUS_SECRET_KEY
//   export BYTEPLUS_REGION=ap-southeast-1   # optional, this is the default
//
// Run it manually (not part of CI) with a TypeScript runner, e.g.:
//   pnpm dlx tsx examples/vod-execution.ts
//
// Replace the empty StartExecution body with your workflow definition.

import { Configuration, DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodApi } from "@byteplus-sdk/vod";

async function main(): Promise<void> {
  const config = new Configuration({
    region: process.env["BYTEPLUS_REGION"] ?? "ap-southeast-1",
    // Resolves credentials from env / CLI config / ECS in the Python-parity order.
    credentialProvider: new DefaultCredentialProvider(),
  });
  const api = new VodApi(config);

  const started = await api.startExecution({
    // input: { ...your workflow input... },
  });
  console.log("StartExecution ->", started);

  if (!started.runId) {
    throw new Error("StartExecution returned no runId");
  }

  // Poll GetExecution until the run leaves a non-terminal state (bounded).
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const execution = await api.getExecution({ runId: started.runId });
    console.log(`GetExecution [${attempt}] ->`, execution.status ?? "(no status)");
    if (execution.status && execution.status !== "running") {
      console.log("Final execution:", execution);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("Still running after the poll budget; check the run later:", started.runId);
}

main().catch((error) => {
  console.error("VOD example failed:", error);
  process.exitCode = 1;
});
