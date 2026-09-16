"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Native <dialog> in the browser's top layer, so focus trapping, Escape and
 * inertness of the page behind come for free. The admin panel had no modal
 * before this; every other disclosure uses <details>.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "medium",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "medium" | "large";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Fires for Escape as well as dialog.close(), so state stays in sync.
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return <dialog
    ref={ref}
    className={`admin-modal admin-modal-${size}`}
    onClick={(event) => { if (event.target === ref.current) ref.current?.close(); }}
  >
    <div className="admin-modal-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <span className="admin-card-subtitle">{subtitle}</span> : null}
      </div>
      <button type="button" className="admin-icon-button" onClick={() => ref.current?.close()} aria-label="Close">
        <X size={16} />
      </button>
    </div>
    <div className="admin-modal-body">{open ? children : null}</div>
  </dialog>;
}
