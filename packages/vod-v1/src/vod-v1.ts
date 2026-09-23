// VodV1 — the top-level v1 VOD facade. Builds a VodV1Client and exposes the
// operations grouped by category. Category namespaces grow one slice at a time
// (US-012 adds `playback`; later slices add `upload`, `media`, `cdn`, …).

import { VodV1Client, type VodV1Options } from "./client.js";
import { VodPlaybackV1 } from "./services/playback.js";
import { VodDrmV1 } from "./services/drm.js";
import { VodUploadV1 } from "./services/upload.js";
import { VodMediaV1 } from "./services/media.js";
import { VodWorkflowV1 } from "./services/workflow.js";
import { VodSpaceV1 } from "./services/space.js";
import { VodCdnV1 } from "./services/cdn.js";
import { VodCallbackV1 } from "./services/callback.js";
import { VodMeasureV1 } from "./services/measure.js";
import { VodQualityV1 } from "./services/quality.js";
import { VodEditV1 } from "./services/edit.js";

export class VodV1 {
  /** The underlying dispatch client (shared by every category service). */
  readonly client: VodV1Client;
  /** Playback ops + play-auth token builders. */
  readonly playback: VodPlaybackV1;
  /** Commercial-DRM token / cert-URL builders. */
  readonly drm: VodDrmV1;
  /** Upload OpenAPI ops (apply/commit/query, upload-by-url, parse-manifest) + TOS transport. */
  readonly upload: VodUploadV1;
  /** Media management (info/list/update/delete, subtitle, playlist, files). */
  readonly media: VodMediaV1;
  /** Transcode / workflow (start, retrieve result, execution status). */
  readonly workflow: VodWorkflowV1;
  /** Space management (create/list/detail/config/storage data). */
  readonly space: VodSpaceV1;
  /** Domain / CDN (domains, refresh/preload tasks, access & usage data). */
  readonly cdn: VodCdnV1;
  /** Callback subscription / event config. */
  readonly callback: VodCallbackV1;
  /** Measure / billing statistics. */
  readonly measure: VodMeasureV1;
  /** Quality platform (media play data). */
  readonly quality: VodQualityV1;
  /** Direct-edit ops (Tier-2: present but unwired in the Python SDK — they throw). */
  readonly edit: VodEditV1;

  constructor(source: VodV1Options | VodV1Client = {}) {
    this.client = source instanceof VodV1Client ? source : new VodV1Client(source);
    this.playback = new VodPlaybackV1(this.client);
    this.drm = new VodDrmV1(this.client);
    this.upload = new VodUploadV1(this.client);
    this.media = new VodMediaV1(this.client);
    this.workflow = new VodWorkflowV1(this.client);
    this.space = new VodSpaceV1(this.client);
    this.cdn = new VodCdnV1(this.client);
    this.callback = new VodCallbackV1(this.client);
    this.measure = new VodMeasureV1(this.client);
    this.quality = new VodQualityV1(this.client);
    this.edit = new VodEditV1(this.client);
  }
}
