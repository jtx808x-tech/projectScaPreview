import { Card } from "@/components/ui/card";

export default function StatCard({ icon: Icon, label, value, sub, accent = "primary", testid }) {
  const accents = {
    primary: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-500",
    sky: "bg-sky-500/10 text-sky-500",
    amber: "bg-amber-500/10 text-amber-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
  };
  return (
    <Card className="stagger-in p-5 transition-transform duration-200 hover:-translate-y-1" data-testid={testid}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-extrabold tracking-tight truncate">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        {Icon && (
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${accents[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
