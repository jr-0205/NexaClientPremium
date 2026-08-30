type Props = {
  open: boolean;
  title: string;
  detail?: string | null;
  progress?: number | null;
};

export function NexaLoadingOverlay({ open, title, detail, progress }: Props) {
  if (!open) return null;
  const safeProgress = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div className="nexa-loading-screen" role="status" aria-live="polite">
      <div className="nexa-loading-screen__veil" />
      <div className="nexa-loading-screen__content">
        <img className="nexa-loading-screen__mark" src="./brand/nexa-mark.png" alt="" />
        <div className="nexa-loading-screen__name">N E X A&nbsp;&nbsp; C L I E N T</div>
        <div className="nexa-loading-screen__spinner" aria-hidden="true" />
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
        {safeProgress != null && (
          <div className="nexa-loading-screen__progress" aria-label={`${Math.round(safeProgress)}%`}>
            <div style={{ width: `${safeProgress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
