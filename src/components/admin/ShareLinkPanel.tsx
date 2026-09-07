"use client";

import { useActionState } from "react";
import { ExternalLink, Link2, LoaderCircle, RotateCw, Unlink } from "lucide-react";
import { revokeShareLinkAction, rotateShareLinkAction, type HandoverActionState } from "@/app/admin/actions/handovers";
import { CopyButton } from "./CopyButton";

type ShareLink = { token: string; expires_at: string; revoked_at: string | null; view_count: number; last_viewed_at: string | null };

export function ShareLinkPanel({ bookingId, siteUrl, activeLink }: { bookingId: string; siteUrl: string; activeLink?: ShareLink | null }) {
  const [state, action, pending] = useActionState(rotateShareLinkAction, {} as HandoverActionState);
  const currentUrl = activeLink ? `${siteUrl}/r/${activeLink.token}` : state.shareUrl ? `${siteUrl}${state.shareUrl}` : "";
  return <section className="admin-form-card admin-share-panel">
    <div className="admin-card-head"><div><h2>Customer paper link</h2><span className="admin-card-subtitle">One revocable, expiring link per booking.</span></div><Link2 size={18} /></div>
    {currentUrl ? <><pre id="customer-share-url" className="admin-share-url">{currentUrl}</pre><div className="admin-share-meta"><span>Expires {activeLink ? new Date(activeLink.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "after return"}</span>{activeLink ? <span>{activeLink.view_count} view{activeLink.view_count === 1 ? "" : "s"}</span> : null}</div><div className="admin-template-actions"><CopyButton text={currentUrl} targetId="customer-share-url" /><a className="admin-secondary-button" href={currentUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Preview</a>{activeLink ? <form action={revokeShareLinkAction}><input type="hidden" name="bookingId" value={bookingId} /><button className="admin-danger-button" type="submit"><Unlink size={14} /> Revoke</button></form> : null}</div></> : <p className="admin-empty-copy">Generate a link after assigning the physical vehicle and uploading its current papers.</p>}
    <form action={action} className="admin-share-create"><input type="hidden" name="bookingId" value={bookingId} /><div className="admin-field"><label htmlFor="shareExpiry">Optional custom expiry</label><input id="shareExpiry" name="expiresAt" type="datetime-local" /></div><button className="admin-primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={14} /> : <RotateCw size={14} />} {currentUrl ? "Rotate link" : "Generate link"}</button></form>
    {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"}>{state.message}</p> : null}
  </section>;
}
