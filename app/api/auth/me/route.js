import { handle, json } from "@/server/http";
import { getCurrentUser } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const u = await getCurrentUser(req);
  return json({ id: u.id, name: u.name, username: u.username, role: u.role });
});
