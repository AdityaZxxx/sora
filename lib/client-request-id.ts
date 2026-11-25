let requestId: string | undefined;

export function getClientRequestId() {
  requestId ??= crypto.randomUUID();
  return requestId;
}
