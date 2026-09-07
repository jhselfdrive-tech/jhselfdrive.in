"use client";

import { useActionState } from "react";
import { Ban, LoaderCircle } from "lucide-react";
import { addBlockAction, type FleetActionState } from "@/app/admin/actions/fleet";

export function BlockForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(addBlockAction, {} as FleetActionState);
  return <form action={action} className="admin-form-card admin-compact-form">
    <input type="hidden" name="vehicleId" value={vehicleId} />
    <div className="admin-card-head"><div><h2>Block availability</h2><span className="admin-card-subtitle">Servicing, repairs or personal use.</span></div></div>
    <div className="admin-form-grid">
      <div className="admin-field"><label htmlFor="blockStart">Starts</label><input id="blockStart" name="startAt" type="datetime-local" required /></div>
      <div className="admin-field"><label htmlFor="blockEnd">Ends</label><input id="blockEnd" name="endAt" type="datetime-local" required /></div>
      <div className="admin-field admin-field-full"><label htmlFor="blockReason">Reason</label><input id="blockReason" name="reason" placeholder="Scheduled service" required /></div>
    </div>
    {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"} role="status">{state.message}</p> : null}
    <div className="admin-form-actions"><button className="admin-secondary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={15} /> : <Ban size={15} />} Add block</button></div>
  </form>;
}
