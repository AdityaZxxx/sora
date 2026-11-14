export class DomainError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DomainError";
  }
}

export function unauthorized() {
  return Response.json({ message: "Unauthorized" }, { status: 401 });
}
