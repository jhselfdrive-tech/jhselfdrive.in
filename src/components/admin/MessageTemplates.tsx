import { MessageCircle } from "lucide-react";
import { composeMessage, messageTemplates, type MessageContext, type MessageTemplateId } from "@/lib/messages/templates";
import { whatsAppUrl } from "@/lib/messages/whatsapp";
import { CopyButton } from "./CopyButton";

export function MessageTemplates({ phone, context }: { phone: string; context: MessageContext }) {
  return <div className="admin-template-grid">{(Object.keys(messageTemplates) as MessageTemplateId[]).map((id) => {
    const template = messageTemplates[id];
    const composed = composeMessage(id, context);
    const targetId = `message-${id}`;
    const title = composed.missing.length ? `Missing: ${composed.missing.join(", ")}` : "Open in WhatsApp";
    return <article className="admin-template-card" key={id}>
      <div><h3>{template.label}</h3><p>{template.description}</p></div>
      <pre id={targetId}>{composed.body}</pre>
      <div className="admin-template-actions"><CopyButton text={composed.body} targetId={targetId} />{composed.isReady ? <a className="admin-primary-button" href={whatsAppUrl(phone, composed.body)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a> : <button className="admin-primary-button" type="button" disabled title={title}><MessageCircle size={14} /> WhatsApp</button>}</div>
    </article>;
  })}</div>;
}
