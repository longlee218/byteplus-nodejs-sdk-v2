// Quality-platform models. Ported from the Python v1 proto. The response `Data`
// is a protobuf Struct list (arbitrary JSON objects).

import type { VodResponse } from "./common.js";

/** Recursive filter (Logic + nested Filters, or a leaf Field/Op/Values). */
export interface GetVodMediaPlayDataFilter {
  Logic?: string;
  Filters?: GetVodMediaPlayDataFilter[];
  Field?: string;
  Op?: string;
  Values?: string[];
}

export interface GetVodMediaPlayDataRequest {
  AppID?: string;
  Platform?: string;
  StartTime?: string;
  EndTime?: string;
  Granularity?: number;
  Metrics?: string[];
  Dimensions?: string[];
  Filter?: GetVodMediaPlayDataFilter;
}

export interface GetVodMediaPlayDataColumn {
  Name?: string;
  Alias?: string;
  Type?: string;
  ValueAlias?: string;
}

export interface GetVodMediaPlayDataResult {
  TotalPoint?: number;
  Columns?: GetVodMediaPlayDataColumn[];
  /** protobuf Struct list → arbitrary JSON rows. */
  Data?: Record<string, unknown>[];
}
export type GetVodMediaPlayDataResponse = VodResponse<GetVodMediaPlayDataResult>;
