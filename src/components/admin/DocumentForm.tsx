"use client";

import { useActionState } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { addDocumentAction, type FleetActionState } from "@/app/admin/actions/fleet";

export function DocumentForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(addDocumentAction, {} as FleetActionState);
  return <form action={action} className="admin-form-card admin-compact-form">
    <input type="hidden" name="vehicleId" value={vehicleId} />
    <div className="admin-card-head"><div><h2>Add document renewal</h2><span className="admin-card-subtitle">Previous periods stay in history.</span></div></div>
    <div className="admin-form-grid">
      <div className="admin-field"><label htmlFor="docType">Document</label><select id="docType" name="docType"><option value="insurance">Insurance</option><option value="fitness">Fitness certificate</option><option value="permit">Permit</option><option value="puc">PUC</option><option value="road_tax">Road tax</option></select></div>
      <div className="admin-field"><label htmlFor="provider">Provider</label><input id="provider" name="provider" placeholder="Insurer or authority" /></div>
      <div className="admin-field"><label htmlFor="referenceNumber">Reference number</label><input id="referenceNumber" name="referenceNumber" /></div>
      <div className="admin-field"><label htmlFor="issuedOn">Issued on</label><input id="issuedOn" name="issuedOn" type="date" /></div>
      <div className="admin-field"><label htmlFor="expiresOn">Expires on</label><input id="expiresOn" name="expiresOn" type="date" required /></div>
      <div className="admin-field admin-field-full"><label htmlFor="documentNotes">Notes</label><input id="documentNotes" name="notes" /></div>
    </div>
    {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"} role="status">{state.message}</p> : null}
    <div className="admin-form-actions"><button className="admin-secondary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={15} /> : <FilePlus2 size={15} />} Add document</button></div>
  </form>;
}
