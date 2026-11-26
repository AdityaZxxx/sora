import { jsonReadResponse, unauthorized } from "@/lib/api-route";
import { listApiTokens } from "@/lib/api-token";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const tokens = await listApiTokens(session.user.id);
  return jsonReadResponse(request, tokens);
}
