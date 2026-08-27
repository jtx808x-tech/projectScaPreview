import { Check, Loader2 } from "lucide-react";
import { useLang } from "@/context/LangContext";

const COLORS = {
  done: "bg-emerald-500 text-white border-emerald-600",
  processing: "bg-blue-500 text-white border-blue-600 ring-4 ring-blue-500/20",
  waiting: "bg-amber-500 text-amber-950 border-amber-600",
  muted: "bg-secondary text-muted-foreground border-border",
};

export default function ProductionStepper({ po, onSelect, activeStage }) {
  const { stageName } = useLang();
  const enabled = (po.enabled_stages || []).slice().sort((a, b) => a - b);
  const cur = po.computed?.current_stage;
  const completed = po.computed?.is_completed;

  const statusFor = (num) => {
    if (completed) return "done";
    if (cur === 0) return "done";
    if (num < cur) return "done";
    if (num === cur) return "processing";
    return "waiting";
  };

  return (
    <div className="flex flex-col gap-2" data-testid="production-stepper">
      {enabled.map((num) => {
        const st = statusFor(num);
        const isActive = activeStage === num;
        return (
          <button key={num} onClick={() => onSelect && onSelect(num)}
            data-testid={`stepper-stage-${num}`}
            className={`flex items-center gap-3 text-left rounded-xl border p-3 transition-colors ${isActive ? "border-primary bg-accent" : "border-border hover:bg-accent/50"}`}>
            <div className={`h-9 w-9 shrink-0 rounded-full border flex items-center justify-center font-bold text-sm ${COLORS[st]}`}>
              {st === "done" ? <Check className="h-4 w-4" /> : st === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : num}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Tahap {num}</div>
              <div className="text-sm font-medium truncate">{stageName(num)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
