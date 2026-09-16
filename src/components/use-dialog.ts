import { useEffect, useRef } from "react";

/**
 * Drives a native <dialog> from React state. The browser's top layer gives us
 * focus trapping, Escape and page inertness for free; this only keeps the
 * element in sync with `open` and reports every close back, however it happened.
 */
export function useDialogElement(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // showModal() focuses the dialog's first control and scrolls its document
      // position into view, which yanks the page behind the modal. Undo that so
      // the view stays exactly where the user left it.
      const restore = window.scrollY;
      dialog.showModal();
      window.scrollTo(0, restore);
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The page behind a native <dialog> is inert to clicks but still scrolls,
  // which reads as the modal drifting on a phone. Lock it while one is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Fires for Escape and for dialog.close() alike, so state never drifts.
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return ref;
}

/**
 * Closes the dialog when the backdrop is clicked but not its contents. Reads
 * the event rather than a ref, so it is safe to attach during render.
 */
export function closeOnBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
  if (event.target === event.currentTarget) event.currentTarget.close();
}
