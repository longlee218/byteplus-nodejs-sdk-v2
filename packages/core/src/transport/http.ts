// Injectable HTTP client. The default uses global fetch (Node >= 18) so the
// pipeline is provable offline by swapping in a recording client.

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type HttpClient = (req: HttpRequest) => Promise<HttpResponse>;

/** Default client backed by global fetch. */
export const fetchHttpClient: HttpClient = async (req) => {
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
  });
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return { status: res.status, headers, body: await res.text() };
};
