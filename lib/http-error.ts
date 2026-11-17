export function rejection(
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json({ message }, { status, headers });
}

export function unauthorized(headers?: HeadersInit): Response {
  return rejection("Unauthorized", 401, headers);
}
