// VodV1 — the top-level v1 VOD facade. Builds a VodV1Client and exposes the
// operations grouped by category. Category namespaces grow one slice at a time
// (US-012 adds `playback`; later slices add `upload`, `media`, `cdn`, …).

import { VodV1Client, type VodV1Options } from "./client.js";
import { VodPlaybackV1 } from "./services/playback.js";

export class VodV1 {
  /** The underlying dispatch client (shared by every category service). */
  readonly client: VodV1Client;
  /** Playback ops + play-auth token builders. */
  readonly playback: VodPlaybackV1;

  constructor(source: VodV1Options | VodV1Client = {}) {
    this.client = source instanceof VodV1Client ? source : new VodV1Client(source);
    this.playback = new VodPlaybackV1(this.client);
  }
}
