"use client";

import { useActionState, useState } from "react";
import { Check, Copy, LoaderCircle, MessageCircle, Send, SkipForward } from "lucide-react";
import { markMessageSentAction, markMessageSkippedAction, type MessageActionState } from "@/app/admin/actions/messages";
import { eventLabel } from "@/lib/messages/events";
import { formatIstDateTime } from "@/lib/messages/format";
import { whatsAppUrl } from "@/lib/messages/whatsapp";
import type { BookingMessage } from "@/lib/admin/messages";

function SendRow({ message }: { message: BookingMessage }) {
  const [sentState, sendAction, sending] = useActionState(markMessageSentAction, {} as MessageActionState);
  const [skipState, skipAction, skipping] = useActionState(markMessageSkippedAction, {} as MessageActionState);
  return <div className="admin-message-row-actions">
    <a className="admin-primary-button admin-compact-button" href={whatsAppUrl(message.phone, message.body)} target="_blank" rel="noreferrer">
      <MessageCircle size={13} /> WhatsApp
    </a>
    <form action={sendAction}>
      <input type="hidden" name="id" value={message.id} />
      <button className="admin-secondary-button admin-compact-button" type="submit" disabled={sending}>
        {sending ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />} Mark sent
      </button>
    </form>
    <form action={skipAction}>
      <input type="hidden" name="id" value={message.id} />
      <input type="hidden" name="reason" value="Skipped from the message log" />
      <button className="admin-secondary-button admin-compact-button" type="submit" disabled={skipping}>
        {skipping ? <LoaderCircle size={13} className="animate-spin" /> : <SkipForward size={13} />} Skip
      </button>
    </form>
    {(sentState.message && !sentState.success) || (skipState.message && !skipState.success)
      ? <small className="admin-field-warning">{sentState.message || skipState.message}</small>
      : null}
  </div>;
}

function outcome(message: BookingMessage) {
  if (message.status === "sent") return `Sent ${message.sent_at ? formatIstDateTime(message.sent_at) : ""}${message.actor ? ` · ${message.actor}` : ""}`;
  if (message.status === "skipped") return `Skipped${message.skipped_reason ? ` · ${message.skipped_reason}` : ""}${message.actor ? ` · ${message.actor}` : ""}`;
  return "Not sent yet";
}

export function BookingMessageLog({ messages }: { messages: BookingMessage[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const due = messages.filter((message) => message.status === "due").length;

  if (!messages.length) {
    return <p className="admin-empty">No customer messages yet. They are created automatically as the booking moves.</p>;
  }

  return <>
    {due ? <p className="admin-field-warning admin-message-due-note">
      {due} message{due === 1 ? "" : "s"} not sent yet.
    </p> : null}
    <ul className="admin-message-log">
      {messages.map((message) => <li key={message.id} className={`admin-message-item admin-message-${message.status}`}>
        <div className="admin-message-item-head">
          <div>
            <strong>{eventLabel(message.event_key)}</strong>
            <small>{outcome(message)}</small>
          </div>
          <span className={`admin-status admin-status-message-${message.status}`}>
            {message.status === "sent" ? <><Check size={11} /> Sent</> : message.status === "skipped" ? "Skipped" : "Due"}
          </span>
        </div>

        <button type="button" className="admin-text-button" onClick={() => setExpanded(expanded === message.id ? null : message.id)}>
          {expanded === message.id ? "Hide message" : "Show message"}
        </button>

        {expanded === message.id ? <>
          <pre className="admin-message-preview">{message.body}</pre>
          <div className="admin-message-row-actions">
            <button type="button" className="admin-secondary-button admin-compact-button" onClick={() => navigator.clipboard.writeText(message.body).catch(() => undefined)}>
              <Copy size={13} /> Copy
            </button>
          </div>
        </> : null}

        {message.status === "due" ? <SendRow message={message} /> : null}
      </li>)}
    </ul>
  </>;
}
