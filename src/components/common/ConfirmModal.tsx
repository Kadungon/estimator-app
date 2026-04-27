import { X, AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "primary";
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "primary"
}: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ 
              background: variant === "danger" ? "var(--danger-dim)" : "var(--primary-dim)", 
              color: variant === "danger" ? "var(--danger)" : "var(--primary)",
              padding: 8,
              borderRadius: "50%",
              display: "flex"
            }}>
              <AlertTriangle size={20} />
            </div>
            <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onCancel}><X size={18} /></button>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>

        <div className="modal-actions" style={{ marginTop: 28 }}>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button 
            className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
