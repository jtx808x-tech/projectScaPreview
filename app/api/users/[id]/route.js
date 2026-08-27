import { handle, json, HttpError } from "@/server/http";
import { requireSuperadmin } from "@/server/auth";
import { getDb, COL } from "@/server/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = handle(async (req, { params }) => {
  const current = await requireSuperadmin(req);
  const { id } = await params;
  const db = await getDb();
  const user = await db.collection(COL.users).findOne({ id });
  if (!user) throw new HttpError(404, "User tidak ditemukan");
  if (user.id === current.id) throw new HttpError(400, "Tidak bisa menghapus diri sendiri");
  await db.collection(COL.users).deleteOne({ id });
  return json({ success: true });
});
