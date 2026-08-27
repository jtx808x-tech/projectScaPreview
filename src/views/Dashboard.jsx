import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { FileStack, Droplets, Activity, Wallet, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatRupiah, formatNumber, formatDateID, TRX_LABEL } from "@/lib/format";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const trxBadge = (t) => {
  const map = { masuk: "bg-emerald-500/15 text-emerald-600", keluar: "bg-rose-500/15 text-rose-500", retur: "bg-amber-500/15 text-amber-600" };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[t]}`}>{TRX_LABEL[t]}</span>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
    </div>
  );

  const isSuper = user?.role === "superadmin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan stok & aktivitas mutasi tahun {data.year}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard testid="card-total-paper" icon={FileStack} accent="primary" label="Total Stok Kertas"
          value={`${formatNumber(data.total_paper_stock)} Rim`} />
        <StatCard testid="card-total-ink" icon={Droplets} accent="rose" label="Total Stok Tinta"
          value={`${formatNumber(data.total_ink_stock)} Kg`} />
        <StatCard testid="card-mutations-today" icon={Activity} accent="sky" label="Mutasi Hari Ini"
          value={`${data.mutations_today} transaksi`} sub="Kertas & tinta" />
        {isSuper ? (
          <StatCard testid="card-nominal-total" icon={Wallet} accent="emerald" label="Total Nominal Stok"
            value={formatRupiah(data.nominal_total)} sub={`Kertas ${formatRupiah(data.nominal_paper)} • Tinta ${formatRupiah(data.nominal_ink)} • Lain ${formatRupiah(data.nominal_other || 0)}`} />
        ) : (
          <StatCard testid="card-nominal-hidden" icon={Wallet} accent="emerald" label="Total Nominal Stok"
            value="Terkunci" sub="Buka via Laporan Detail" />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-bold">Tren Mutasi (6 Bulan Terakhir)</h3>
          <p className="mb-4 text-xs text-muted-foreground">Perbandingan jumlah Masuk vs Keluar.</p>
          <div className="h-64" data-testid="dashboard-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="paper_masuk" name="Kertas Masuk" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="paper_keluar" name="Kertas Keluar" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ink_masuk" name="Tinta Masuk" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ink_keluar" name="Tinta Keluar" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Mutasi Terbaru</h3>
          </div>
          <div className="space-y-2" data-testid="dashboard-recent-list">
            {data.recent.length === 0 && <p className="text-sm text-muted-foreground">Belum ada mutasi.</p>}
            {data.recent.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{m.kategori}</Badge>
                    <span className="truncate text-sm font-medium">{m.nama}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatDateID(m.date)} • {m.pic_name}</div>
                </div>
                <div className="text-right">
                  {trxBadge(m.jenis_transaksi)}
                  <div className="mt-0.5 text-xs font-semibold">{formatNumber(m.jumlah)} {m.satuan}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/kertas" className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Lihat semua mutasi <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
