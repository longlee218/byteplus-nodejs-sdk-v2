// Transcode / workflow models. Ported from the Python v1 proto. Proto map
// fields (VarsEntry/ConditionEntry/ParentInfoEntry) render as JSON objects, so
// they are modeled as `Record<...>`.

import type { VodResponse } from "./common.js";

// ---- shared workflow param tree (request Input + execution) ----------------

export interface Clip {
  StartTime?: number;
  EndTime?: number;
}
export interface LogoOverride {
  TemplateId?: string;
  Vars?: Record<string, string>;
}
export interface TranscodeVideoOverride {
  TemplateId?: string[];
  Clip?: Clip;
  OutputIndex?: number[];
  FileName?: string;
}
export interface TranscodeAudioOverride {
  TemplateId?: string[];
  Clip?: Clip;
  FileName?: string;
}
export interface SnapshotOverride {
  TemplateId?: string[];
  OffsetTime?: number;
  OffsetTimeList?: number[];
  FileName?: string;
}
export interface EnhanceOverride {
  StorageMode?: string;
  FileName?: string;
}
export interface OverrideParams {
  Logo?: LogoOverride[];
  TranscodeVideo?: TranscodeVideoOverride[];
  TranscodeAudio?: TranscodeAudioOverride[];
  Snapshot?: SnapshotOverride[];
  Enhance?: EnhanceOverride;
}
export interface WorkflowParams {
  OverrideParams?: OverrideParams;
  Condition?: Record<string, boolean>;
}
export interface DirectUrl {
  FileName?: string;
  BucketName?: string;
}

// ---- StartWorkflow ---------------------------------------------------------

export interface StartWorkflowRequest {
  Vid?: string;
  TemplateId?: string;
  Input?: WorkflowParams;
  Priority?: number;
  CallbackArgs?: string;
  EnableLowPriority?: boolean;
  DirectUrl?: DirectUrl;
  TaskListId?: string;
}
export interface VodStartWorkflowResult {
  RunId?: string;
}
export type StartWorkflowResponse = VodResponse<VodStartWorkflowResult>;

// ---- RetrieveTranscodeResult -----------------------------------------------

export interface RetrieveTranscodeResultRequest {
  Vid?: string;
  ResultType?: string;
}
export interface VisualQuality {
  VQScore?: number;
  Contrast?: number;
  Colorfulness?: number;
  Brightness?: number;
  Texture?: number;
  Noise?: number;
}
export interface VolumeInfo {
  Loudness?: number;
  Peak?: number;
  MeanVolume?: number;
  MaxVolume?: number;
}
export interface Quality {
  Visual?: VisualQuality;
  VolumeInfo?: VolumeInfo;
}
export interface DeLogoInfo {
  AnchorWidth?: number;
  AnchorHeight?: number;
  PosX?: number;
  PosY?: number;
  SizeX?: number;
  SizeY?: number;
}
export interface Inspection {
  Quality?: Quality;
  DeLogo?: DeLogoInfo[];
}
export interface CategoryTagInfo {
  TagId?: number;
  Prob?: number;
  TagName?: string;
  Level?: number;
  ParentInfo?: Record<string, string>;
}
export interface TranscodeResult {
  Vid?: string;
  Inspection?: Inspection;
  CategoryTags?: CategoryTagInfo[];
}
export type RetrieveTranscodeResultResponse = VodResponse<TranscodeResult>;

// ---- GetWorkflowExecution (VodGetWorkflowExecutionStatus*) -----------------

export interface GetWorkflowExecutionRequest {
  RunId?: string;
  NeedTasksDetail?: string;
}
export interface Timestamp {
  seconds?: number;
  nanos?: number;
}
export interface TaskDetail {
  DisplayName?: string;
  TemplateId?: string;
  Status?: string;
  Progress?: number;
  StartTime?: Timestamp;
  EndTime?: Timestamp;
}
export interface WorkflowExecution {
  RunId?: string;
  Vid?: string;
  TemplateId?: string;
  TemplateName?: string;
  SpaceName?: string;
  Status?: string;
  TaskListId?: string;
  EnableLowPriority?: boolean;
  JobSource?: string;
  CreateTime?: Timestamp;
  StartTime?: Timestamp;
  EndTime?: Timestamp;
  Input?: WorkflowParams;
  Priority?: number;
  CallbackArgs?: string;
  TasksDetail?: TaskDetail[];
  DirectUrl?: DirectUrl;
}
export type GetWorkflowExecutionResponse = VodResponse<WorkflowExecution>;
