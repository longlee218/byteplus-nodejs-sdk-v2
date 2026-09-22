/** Error carrying BytePlus HTTP/business failure detail (Python ApiException). */
export class ApiException extends Error {
  readonly status: number;
  readonly body?: string;
  readonly headers?: Record<string, string>;

  constructor(status: number, reason: string, body?: string, headers?: Record<string, string>) {
    super(`ApiException(status=${status}): ${reason}`);
    this.name = "ApiException";
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}
