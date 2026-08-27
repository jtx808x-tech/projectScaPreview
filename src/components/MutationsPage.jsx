import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, FileDown, Pencil, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { useAuth, apiError } from "@/context/AuthContext";
import { formatRupiah, formatNumber, formatDateID, todayStr, TRX_LABEL } from "@/lib/format";
import MutationForm from "@/components/MutationForm";
import PeriodFilter from "@/components/PeriodFilter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const trxBadge = (t) => {
  const map = { masuk: "bg-emerald-500/15 text-emerald-600", keluar: "bg-rose-500/15 text-rose-500", retur: "bg-amber-500/15 text-amber-600" };
  return <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${map[t]}`}>{TRX_LABEL[t]}</span>;
};

const TITLES = { paper: "Kertas", ink: "Tinta", other: "Lain" };

export default function MutationsPage({ type }) {
  const isPaper = type === "paper";
  const isInk = type === "ink";
  const isOther = type === "other";
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [jenisOptions, setJenisOptions] = useState([]);
  const [period, setPeriod] = useState({ start: "", end: "" });
  const [fJenis, setFJenis] = useState("all");
  const [fTrx, setFTrx] = useState("all");
  const [fSupplier, setFSupplier] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [delId, setDelId] = useState(null);
  const [loading, setLoading] = useState(false);

  const base = `/${type}`;
  const nameOf = (m) => isPaper ? m.jenis_kertas : isOther ? m.nama_barang : m.jenis_tinta;
  const unitOf = (m) => isPaper ? "Rim" : isInk ? "Kg" : (m.satuan || "");
  const priceOf = (m) => isPaper ? m.harga_per_rim : isInk ? m.harga_per_kg : m.harga_per_satuan;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year: new Date().getFullYear() };
      if (period.start) params.start = period.start;
      if (period.end) params.end = period.end;
      if (fJenis !== "all") params.jenis = fJenis;
      if (fTrx !== "all") params.transaksi = fTrx;
      if (fSupplier) params.supplier = fSupplier;
      if (search) params.search = search;
      const [{ data }, jr] = await Promise.all([
        api.get(`${base}/mutations`, { params }),
        api.get(`${base}/jenis`),
      ]);
      setRows(data);
      setJenisOptions(jr.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [base, period, fJenis, fTrx, fSupplier, search]);

  useEffect(() => { load(); }, [load]);

  const keluarOptions = useMemo(() => rows.filter((r) => r.jenis_transaksi === "keluar"), [rows]);
  const masukOptions = useMemo(() => rows.filter((r) => r.jenis_transaksi === "masuk"), [rows]);
  const rowById = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);

  const canModify = (m) => {
    if (user?.role === "superadmin") return true;
    return m.created_by === user?.id && (m.created_at || "").slice(0, 10) === todayStr();
  };

  const openAdd = () => { setEditData(null); setFormOpen(true); };
  const openEdit = (m) => { setEditData(m); setFormOpen(true); };

  const doDelete = async () => {
    try {
      await api.delete(`${base}/mutations/${delId}`);
      toast.success("Mutasi dihapus.");
      setDelId(null);
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const doDownload = async () => {
    try {
      const params = {};
      if (period.start) params.start = period.start;
      if (period.end) params.end = period.end;
      if (fJenis !== "all") params.jenis = fJenis;
      if (fTrx !== "all") params.transaksi = fTrx;
      if (fSupplier) params.supplier = fSupplier;
      await downloadPdf(`/pdf/${type}-mutations`, params, `laporan-mutasi-${type}.pdf`);
      toast.success("PDF diunduh.");
    } catch (e) { toast.error(apiError(e, "Gagal mengunduh PDF")); }
  };

  const refLabel = (id) => {
    const r = rowById[id];
    return r?.kode ? r.kode : "#" + (id || "").slice(0, 6);
  };

  const colCount = isPaper ? 13 : isOther ? 12 : 11;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Mutasi {TITLES[type]}</h1>
          <p className="text-sm text-muted-foreground">Input & riwayat transaksi Masuk / Keluar / Retur.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" data-testid="download-pdf-button" onClick={doDownload}><FileDown className="h-4 w-4" /> PDF</Button>
          <Button className="gap-2" data-testid="add-mutation-button" onClick={openAdd}><Plus className="h-4 w-4" /> Tambah Mutasi</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <PeriodFilter onChange={setPeriod} />
          <div className="space-y-1.5">
            <Label className="text-xs">{isPaper ? "Jenis Kertas" : isOther ? "Nama Barang" : "Jenis Tinta"}</Label>
            <Select value={fJenis} onValueChange={setFJenis}>
              <SelectTrigger className="w-[160px]" data-testid="filter-jenis"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {jenisOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Transaksi</Label>
            <Select value={fTrx} onValueChange={setFTrx}>
              <SelectTrigger className="w-[140px]" data-testid="filter-transaksi"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="masuk">Masuk</SelectItem>
                <SelectItem value="keluar">Keluar</SelectItem>
                <SelectItem value="retur">Retur/Sisa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier</Label>
            <Input className="w-[150px]" value={fSupplier} data-testid="filter-supplier" placeholder="Supplier" onChange={(e) => setFSupplier(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <Label className="text-xs">Pencarian</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" value={search} data-testid="search-input" placeholder="Cari nama/kode/supplier/PIC…" onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>{isPaper ? "Jenis Kertas" : isOther ? "Nama Barang" : "Jenis Tinta"}</TableHead>
                {isPaper && <><TableHead>Gram</TableHead><TableHead>Ukuran</TableHead></>}
                {isOther && <TableHead>Satuan</TableHead>}
                <TableHead>Transaksi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">PPN</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="mutations-table-body">
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-muted-foreground">Belum ada data mutasi.</TableCell></TableRow>
              )}
              {rows.map((m) => (
                <TableRow key={m.id} className="stagger-in">
                  <TableCell className="whitespace-nowrap">{formatDateID(m.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{m.kode || "-"}</TableCell>
                  <TableCell className="font-medium">
                    {nameOf(m)}
                    {m.ref_mutation_id && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-600">
                        <Link2 className="h-3 w-3" /> Retur dari {refLabel(m.ref_mutation_id)}
                      </span>
                    )}
                  </TableCell>
                  {isPaper && <><TableCell>{formatNumber(m.gramatur)}</TableCell><TableCell className="whitespace-nowrap">{formatNumber(m.panjang)}x{formatNumber(m.lebar)} cm</TableCell></>}
                  {isOther && <TableCell>{m.satuan || "-"}</TableCell>}
                  <TableCell>{trxBadge(m.jenis_transaksi)}</TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">{formatNumber(m.jumlah)} {unitOf(m)}</TableCell>
                  <TableCell>{m.supplier || "-"}</TableCell>
                  <TableCell>{m.pic_name}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {m.jenis_transaksi === "masuk" ? formatRupiah(priceOf(m)) : "-"}
                    {isPaper && m.jenis_transaksi === "masuk" && m.price_mode && (
                      <div className="text-[10px] text-muted-foreground">{{ per_rim: "per rim", per_kg: "per kg", total: "total" }[m.price_mode]}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{m.ppn_ada ? formatRupiah(m.ppn_nominal) : "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" disabled={!canModify(m)} data-testid={`edit-${m.id}`} onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" disabled={!canModify(m)} data-testid={`delete-${m.id}`} onClick={() => setDelId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MutationForm type={type} open={formOpen} onOpenChange={setFormOpen} onSaved={load}
        editData={editData} jenisOptions={jenisOptions} keluarOptions={keluarOptions} masukOptions={masukOptions} userName={user?.name} />

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent data-testid="delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus mutasi ini?</AlertDialogTitle>
            <AlertDialogDescription>Stok akan dihitung ulang otomatis. Tindakan ini akan tercatat di log audit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-button" onClick={doDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
