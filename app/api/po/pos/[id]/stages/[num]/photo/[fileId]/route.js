import { handle, json } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";
import { deleteObject } from "@/server/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = handle(async (req, { params }) => {
  await requireAuth(req);
  const { id, num, fileId } = await params;
  const db = await getDb();
  const rec = await db.collection(COL.poFiles).findOne({ id: fileId });
  if (rec && rec.r2_key) {
    try { await deleteObject(rec.r2_key); } catch (e) { console.warn("[r2] delete gagal:", e?.message); }
  }
  await db.collection(COL.poFiles).updateOne({ id: fileId }, { $set: { is_deleted: true, deleted_at: nowIso() } });

  const po = await db.collection(COL.pos).findOne({ id });
  if (po) {
    const stageData = po.stage_data || {};
    const d = stageData[String(num)] || {};
    d.photos = (d.photos || []).filter((p) => p.id !== fileId);
    stageData[String(num)] = d;
    await db.collection(COL.pos).updateOne({ id }, { $set: { stage_data: stageData, updated_at: nowIso() } });
  }
  return json({ ok: true });
});
