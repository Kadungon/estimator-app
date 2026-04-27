import { HelpCircle } from "lucide-react";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SaveConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 400, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ color: "var(--primary)", marginBottom: 16, display: "flex", justifyContent: "center" }}>
          <HelpCircle size={48} strokeWidth={1.5} />
        </div>
        <h2 className="modal-title">Save Estimation?</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          This will generate a unique estimation number and prepare the PDF for printing.
        </p>
        
        <div className="modal-actions" style={{ justifyContent: "center" }}>
          <button className="btn btn-ghost btn-lg" style={{ minWidth: 120 }} onClick={onCancel}>Cancel</button>
          <button id="confirm-save-btn" className="btn btn-primary btn-lg" style={{ minWidth: 120 }} onClick={onConfirm}>Save Now</button>
        </div>
      </div>
    </div>
  );
}
