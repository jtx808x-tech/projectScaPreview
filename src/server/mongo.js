import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || "laporan_stok_sca";

if (!uri) {
  console.warn("[mongo] MONGO_URL belum diset — API akan gagal sampai env diisi.");
}

const g = globalThis;
if (!g.__scaMongo) {
  g.__scaMongo = { clientPromise: null, initPromise: null };
}

function getClientPromise() {
  if (!g.__scaMongo.clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
    });
    g.__scaMongo.clientPromise = client.connect();
  }
  return g.__scaMongo.clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(dbName);
}

export const COL = {
  users: "users",
  settings: "settings",
  activityLogs: "activity_logs",
  auditLogs: "audit_logs",
  paper: "paper_mutations",
  ink: "ink_mutations",
  other: "other_mutations",
  // HPP Calculator
  hppCalcs: "hpp_calculations",
  // PO Tracker
  pos: "pos",
  poSchedules: "po_schedules",
  poFiles: "po_files",
};

export const COLLECTION_BY_TYPE = {
  paper: COL.paper,
  ink: COL.ink,
  other: COL.other,
};

export function stripId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function currentYear() {
  return new Date().getFullYear();
}
