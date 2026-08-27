import { NextResponse } from "next/server";
import { handle, json, HttpError } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { getDb, COL, nowIso } from "@/server/mongo";
import { putObject } from "@/server/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(name) {
  return String(name || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80);
}

function extOf(name) {
  const m = String(name || "").match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}

export const POST = handle(async (req, { params }) => {
  const current = await requireAuth(req);
  const { id, num } = await params;
  const stageNum = Number(num);
  if (!(stageNum >= 1 && stageNum <= 11)) throw new HttpError(400, "Nomor tahap tidak valid");

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "File tidak ditemukan di form");

  const db = await getDb();
  const po = await db.collection(COL.pos).findOne({ id });
  if (!po) throw new HttpError(404, "PO tidak ditemukan");

  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";
  const size = buf.length;
  const fileId = crypto.randomUUID();
  const ext = extOf(file.name);
  const safeName = sanitize(file.name);
  const key = `sca-production/uploads/${id}/${fileId}.${ext}`;

  const { publicUrl } = await putObject(key, buf, contentType);

  const fileDoc = {
    id: fileId,
    po_id: id,
    stage_number: stageNum,
    r2_key: key,
    public_url: publicUrl,
    original_filename: safeName,
    content_type: contentType,
    size,
    is_deleted: false,
    uploaded_by: current.username,
    created_at: nowIso(),
  };
  await db.collection(COL.poFiles).insertOne({ ...fileDoc });

  const stageData = po.stage_data || {};
  const d = stageData[String(stageNum)] || {};
  const photos = d.photos || [];
  photos.push({ id: fileId, filename: safeName, url: publicUrl });
  d.photos = photos;
  stageData[String(stageNum)] = d;
  await db.collection(COL.pos).updateOne({ id }, { $set: { stage_data: stageData, updated_at: nowIso() } });

  return json({ id: fileId, filename: safeName, url: publicUrl });
});
