import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { FileDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import api, { downloadPdf } from "@/lib/api";
import { apiError } from "@/context/AuthContext";
import { formatRupiah, formatDateID } from "@/lib/format";
import SectionGate from "@/components/SectionGate";
import PeriodFilter from "@/components/PeriodFilter";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, FileStack, Droplets, Package } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function DiffBadge({ diff, pct }) {
  const up = diff > 0, down = diff < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const color = up ? "text-emerald-600" : down ? "text-rose-500" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" /> {formatRupiah(Math.abs(diff))} ({pct}%)
    </span>
  );
}

function Inner() {
  const [period, setPeriod] = useState({ start: "", end: "", label: "" });
  const [data, setData] = useState(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfPwd, setPdfPwd] = useState("");
  const [pdfKind, setPdfKind] = useState("detail");

  const load = useCallback(() => {
    if (!period.start) return;
    api.get("/reports/detail", { params: { start: period.start, end: period.end } })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(apiError(e)));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const confirmDownload = async () => {
    try {
      await api.post("/auth/verify-temp-password", { password: pdfPwd });
    } catch (e) {
      toast.error(apiError(e, "Password salah")); return;
    }
    try {
      const params = { start: period.start, end: period.end };
      if (pdfKind === "detail") await downloadPdf("/pdf/detail", params, "laporan-detail.pdf");
      else await downloadPdf("/pdf/stock-nominal", params, "laporan-stok-keseluruhan.pdf");
      toast.success("PDF diunduh.");
      setPdfOpen(false); setPdfPwd("");
    } catch (e) { toast.error(apiError(e, "Gagal unduh PDF")); }
  };

  const openPdf = (kind) => { setPdfKind(kind); setPdfPwd(""); setPdfOpen(true); };

  const cmp = data?.comparison;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Laporan Detail</h1>
          <p className="text-sm text-muted-foreground">Nominal, grafik, perbandingan periode & PPN. {period.label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" data-testid="pdf-stock-nominal-button" onClick={() => openPdf("nominal")}>
            <FileDown className="h-4 w-4" /> Stok Keseluruhan
          </Button>
          <Button className="gap-2" data-testid="pdf-detail-button" onClick={() => openPdf("detail")}>
            <FileDown className="h-4 w-4" /> PDF Detail
          </Button>
        </div>
      </div>

      <Card className="p-4"><PeriodFilter onChange={setPeriod} /></Card>

      {!data ? <p className="text-muted-foreground">Memuat…</p> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard testid="detail-nominal-paper" icon={FileStack} accent="primary" label="Nominal Stok Kertas" value={formatRupiah(data.nominal_paper)} />
            <StatCard testid="detail-nominal-ink" icon={Droplets} accent="rose" label="Nominal Stok Tinta" value={formatRupiah(data.nominal_ink)} />
            <StatCard testid="detail-nominal-other" icon={Package} accent="amber" label="Nominal Stok Lain" value={formatRupiah(data.nominal_other || 0)} />
            <StatCard testid="detail-nominal-total" icon={Wallet} accent="emerald" label="Total Nominal Stok" value={formatRupiah(data.nominal_total)} />
          </div>

          {/* Comparison */}
          <Card className="p-5">
            <h3 className="font-display text-lg font-bold">Perbandingan Periode Sebelumnya</h3>
            <p className="mb-4 text-xs text-muted-foreground">Dibandingkan {formatDateID(cmp.prev_start)} s.d. {formatDateID(cmp.prev_end)}.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="comparison-grid">
              <div className="rounded-md border border-border p-4">
                <div className="text-xs text-muted-foreground">Nominal Kertas</div>
                <div className="font-display text-xl font-bold">{formatRupiah(cmp.paper_nominal.current)}</div>
                <DiffBadge diff={cmp.paper_nominal.diff} pct={cmp.paper_nominal.pct} />
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="text-xs text-muted-foreground">Nominal Tinta</div>
                <div className="font-display text-xl font-bold">{formatRupiah(cmp.ink_nominal.current)}</div>
                <DiffBadge diff={cmp.ink_nominal.diff} pct={cmp.ink_nominal.pct} />
              </div>
              {cmp.other_nominal && (
                <div className="rounded-md border border-border p-4">
                  <div className="text-xs text-muted-foreground">Nominal Lain</div>
                  <div className="font-display text-xl font-bold">{formatRupiah(cmp.other_nominal.current)}</div>
                  <DiffBadge diff={cmp.other_nominal.diff} pct={cmp.other_nominal.pct} />
                </div>
              )}
              <div className="rounded-md border border-border p-4">
                <div className="text-xs text-muted-foreground">Mutasi Kertas (M/K)</div>
                <div className="font-display text-xl font-bold">{cmp.paper_masuk.current} / {cmp.paper_keluar.current}</div>
                <div className="text-xs text-muted-foreground">Lalu: {cmp.paper_masuk.prev} / {cmp.paper_keluar.prev}</div>
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="text-xs text-muted-foreground">Mutasi Tinta (M/K)</div>
                <div className="font-display text-xl font-bold">{cmp.ink_masuk.current} / {cmp.ink_keluar.current}</div>
                <div className="text-xs text-muted-foreground">Lalu: {cmp.ink_masuk.prev} / {cmp.ink_keluar.prev}</div>
              </div>
            </div>
          </Card>

          {/* Composition pies */}
          <div className="grid gap-4 lg:grid-cols-3">
            {[["Komposisi Nominal Kertas", data.paper_composition], ["Komposisi Nominal Tinta", data.ink_composition], ["Komposisi Nominal Lain", data.other_composition || []]].map(([title, comp]) => (
              <Card key={title} className="p-5">
                <h3 className="mb-2 font-display text-lg font-bold">{title}</h3>
                <div className="h-64">
                  {comp.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={comp} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                          {comp.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="grid h-full place-items-center text-sm text-muted-foreground">Belum ada data nominal.</div>}
                </div>
              </Card>
            ))}
          </div>

          {/* Monthly trend + value */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 font-display text-lg font-bold">Tren Mutasi per Bulan</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly_trend} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="paper_masuk" name="Kertas Masuk" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                    <Line dataKey="paper_keluar" name="Kertas Keluar" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line dataKey="ink_masuk" name="Tinta Masuk" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    <Line dataKey="ink_keluar" name="Tinta Keluar" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 font-display text-lg font-bold">Nilai Total Stok per Bulan (Rp)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly_value} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v / 1e6).toFixed(0) + "jt"} />
                    <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="paper" name="Kertas" stackId="a" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="ink" name="Tinta" stackId="a" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="other" name="Lain" stackId="a" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* PPN */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Laporan PPN Dibayarkan per Bulan</h3>
              <span className="text-sm font-semibold">Total Tahun: {formatRupiah(data.ppn_total_year)}</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Bulan</TableHead><TableHead className="text-right">Kertas</TableHead>
                      <TableHead className="text-right">Tinta</TableHead><TableHead className="text-right">Lain</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                  </TableHeader>
                  <TableBody data-testid="ppn-table">
                    {data.ppn_monthly.map((p) => (
                      <TableRow key={p.label}>
                        <TableCell>{p.label}</TableCell>
                        <TableCell className="text-right">{formatRupiah(p.paper)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(p.ink)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(p.other || 0)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRupiah(p.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ppn_monthly.map((p) => ({ ...p, label: p.label.slice(0, 3) }))} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v / 1e6).toFixed(0) + "jt"} />
                    <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="paper" name="Kertas" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="ink" name="Tinta" fill="hsl(var(--chart-4))" />
                    <Bar dataKey="other" name="Lain" fill="hsl(var(--chart-5))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </>
      )}

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent data-testid="pdf-password-dialog">
          <DialogHeader><DialogTitle>Konfirmasi Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Masukkan password akses sementara untuk mengunduh laporan bernominal ini.</p>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={pdfPwd} data-testid="pdf-password-input" onChange={(e) => setPdfPwd(e.target.value)} autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmDownload()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfOpen(false)}>Batal</Button>
            <Button data-testid="pdf-password-confirm" onClick={confirmDownload}>Unduh PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DetailReport() {
  return <SectionGate title="Laporan Detail (Nominal & Grafik)"><Inner /></SectionGate>;
}
