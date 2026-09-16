"use client";

import { X } from "lucide-react";
import { closeOnBackdropClick, useDialogElement } from "@/components/use-dialog";

/**
 * The admin panel's only overlay — everything else here uses <details>.
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
  const ref = useDialogElement(open, onClose);

  return <dialog ref={ref} className={`admin-modal admin-modal-${size}`} onClick={closeOnBackdropClick}>
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
