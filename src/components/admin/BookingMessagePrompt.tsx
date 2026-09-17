"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Copy, LoaderCircle, MessageCircle, Send, SkipForward } from "lucide-react";
import { markMessageSentAction, markMessageSkippedAction, type MessageActionState } from "@/app/admin/actions/messages";
import { whatsAppUrl } from "@/lib/messages/whatsapp";
import type { QueuedMessage } from "@/lib/admin/messages";
import { Modal } from "./Modal";

/**
 * Shown straight after any action that left a customer message outstanding, so
 * the operator never has to know which template applies.
 */
export function BookingMessagePrompt({ queued, onClose }: { queued: QueuedMessage; onClose: () => void }) {
  const [sentState, sendAction, sending] = useActionState(markMessageSentAction, {} as MessageActionState);
  const [skipState, skipAction, skipping] = useActionState(markMessageSkippedAction, {} as MessageActionState);
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const closed = useRef(false);

  // Either outcome resolves the prompt. onClose is an inline arrow in the
  // parent, so guard against the effect re-firing on later renders.
  const resolved = sentState.success || skipState.success;
  useEffect(() => {
    if (resolved && !closed.current) { closed.current = true; onClose(); }
  }, [resolved, onClose]);

  const error = (!sentState.success && sentState.message) || (!skipState.success && skipState.message);

  return <Modal
    open
    onClose={onClose}
    title="Tell the customer"
    subtitle="Open WhatsApp, send it, then mark it sent so the log stays accurate."
  >
    <pre className="admin-message-preview">{queued.body}</pre>

    <div className="admin-message-actions">
      <button type="button" className="admin-secondary-button" onClick={() => {
        navigator.clipboard.writeText(queued.body).then(() => setCopied(true)).catch(() => undefined);
      }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>

      <a
        className="admin-primary-button"
        href={whatsAppUrl(queued.phone, queued.body)}
        target="_blank"
        rel="noreferrer"
        onClick={() => setOpened(true)}
      ><MessageCircle size={14} /> Open WhatsApp</a>

      <form action={sendAction}>
        <input type="hidden" name="id" value={queued.id} />
        <button className={opened ? "admin-primary-button" : "admin-secondary-button"} type="submit" disabled={sending}>
          {sending ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} Mark as sent
        </button>
      </form>
    </div>

    {opened ? <p className="admin-field-success">WhatsApp opened — mark it sent once the message has gone.</p> : null}

    {showSkip ? (
      <form action={skipAction} className="admin-message-skip">
        <div className="admin-field">
          <label htmlFor={`skip-${queued.id}`}>Why are you skipping this?</label>
          <input id={`skip-${queued.id}`} name="reason" maxLength={300} placeholder="Already told them on a call" />
        </div>
        <input type="hidden" name="id" value={queued.id} />
        <div className="admin-form-actions">
          <button type="button" className="admin-secondary-button" onClick={() => setShowSkip(false)}>Back</button>
          <button className="admin-danger-button" type="submit" disabled={skipping}>
            {skipping ? <LoaderCircle size={14} className="animate-spin" /> : <SkipForward size={14} />} Skip this message
          </button>
        </div>
      </form>
    ) : (
      <button type="button" className="admin-text-button admin-message-skip-link" onClick={() => setShowSkip(true)}>
        Skip — no message needed
      </button>
    )}

    {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
  </Modal>;
}
