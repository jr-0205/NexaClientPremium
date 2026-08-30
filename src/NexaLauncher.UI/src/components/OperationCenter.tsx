import { Clock3, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OperationProgress } from "../app/types";

type Props = {
  operation: OperationProgress | null;
};

export function OperationCenter({ operation }: Props) {
  const startedAt = useRef<number | null>(null);
  const lastStage = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!operation) {
      startedAt.current = null;
      lastStage.current = null;
      return;
    }
    if (startedAt.current === null || lastStage.current !== operation.stage) {
      startedAt.current = Date.now();
      lastStage.current = operation.stage;
      setNow(Date.now());
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [operation?.stage, Boolean(operation)]);

  const metrics = useMemo(() => {
    if (!operation || startedAt.current === null) return null;
    const total = Math.max(0, operation.total ?? 0);
    const completed = Math.max(0, operation.completed ?? 0);
    const percentage = total > 0
      ? Math.max(0, Math.min(100, operation.percentage ?? ((completed / Math.max(1, total)) * 100)))
      : Math.max(0, Math.min(100, operation.percentage ?? 0));
    const elapsedSeconds = Math.max(0, Math.round((now - startedAt.current) / 1000));
    const fraction = percentage / 100;
    const etaSeconds = fraction > 0.03 && fraction < 0.999
      ? Math.max(0, Math.round((elapsedSeconds / fraction) - elapsedSeconds))
      : null;
    return { total, completed, percentage, elapsedSeconds, etaSeconds };
  }, [operation, now]);

  if (!operation || !metrics) return null;

  return (
    <aside className="operation-center glass-panel" aria-live="polite" aria-label="Progreso de operación">
      <div className="operation-center-head">
        <span className="operation-spinner"><Loader2 className="spin" size={17} /></span>
        <div className="operation-center-title">
          <span>OPERACIÓN EN CURSO</span>
          <strong>{operation.stage}</strong>
        </div>
        <strong className="operation-percent">{Math.round(metrics.percentage)}%</strong>
      </div>

      <div className="operation-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(metrics.percentage)}>
        <span style={{ width: `${metrics.percentage}%` }} />
      </div>

      <div className="operation-center-meta">
        <span><Clock3 size={13} /> {formatDuration(metrics.elapsedSeconds)} transcurrido</span>
        {metrics.etaSeconds !== null && <span>ETA ~ {formatDuration(metrics.etaSeconds)}</span>}
        {metrics.total > 0 && <span>{metrics.completed} / {metrics.total}</span>}
      </div>
    </aside>
  );
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${(minutes % 60).toString().padStart(2, "0")}m`;
}
