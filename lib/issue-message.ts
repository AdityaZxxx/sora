const MACHINE_MESSAGE =
  /^(invalid (input|option|string|number|date|boolean|enum|type)|too small|too big|expected|bad request)/i;

export function firstIssueMessage(
  message: string | undefined,
  fallback: string,
): string {
  return message && !MACHINE_MESSAGE.test(message.trim()) ? message : fallback;
}
