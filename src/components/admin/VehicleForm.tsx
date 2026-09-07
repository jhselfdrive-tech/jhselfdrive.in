"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { saveVehicleAction, type FleetActionState } from "@/app/admin/actions/fleet";
import { site } from "@/content/site";
import type { Vehicle } from "@/lib/admin/fleet";

export function VehicleForm({ vehicle }: { vehicle?: Vehicle | null }) {
  const [state, action, pending] = useActionState(saveVehicleAction, {} as FleetActionState);
  return <form action={action} className="admin-form-card">
    {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
    <div className="admin-card-head"><div><h2>{vehicle ? "Vehicle details" : "Add a physical vehicle"}</h2><span className="admin-card-subtitle">Registration is normalized to uppercase without spaces.</span></div></div>
    <div className="admin-form-grid">
      <div className="admin-field"><label htmlFor="registrationNumber">Registration number</label><input id="registrationNumber" name="registrationNumber" defaultValue={vehicle?.registration_number || ""} placeholder="TN65AB1234" required /></div>
      <div className="admin-field"><label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" defaultValue={vehicle?.display_name || ""} placeholder="White Ertiga" /></div>
      <div className="admin-field"><label htmlFor="categorySlug">Public category</label><select id="categorySlug" name="categorySlug" defaultValue={vehicle?.category_slug || site.fleet[0].slug}>{site.fleet.map((car) => <option value={car.slug} key={car.slug}>{car.name}</option>)}</select></div>
      <div className="admin-field"><label htmlFor="model">Model</label><input id="model" name="model" defaultValue={vehicle?.model || ""} placeholder="Maruti Suzuki Ertiga" /></div>
      <div className="admin-field"><label htmlFor="year">Year</label><input id="year" name="year" type="number" min="1980" max="2100" defaultValue={vehicle?.year || ""} /></div>
      <div className="admin-field"><label htmlFor="seats">Seats</label><input id="seats" name="seats" type="number" min="1" max="60" defaultValue={vehicle?.seats || ""} /></div>
      <div className="admin-field"><label htmlFor="transmission">Transmission</label><select id="transmission" name="transmission" defaultValue={vehicle?.transmission || "Manual"}><option>Manual</option><option>Automatic</option><option>AMT</option><option>CVT</option></select></div>
      <div className="admin-field"><label htmlFor="fuel">Fuel</label><select id="fuel" name="fuel" defaultValue={vehicle?.fuel || "Petrol"}><option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option><option>Hybrid</option></select></div>
      <div className="admin-field"><label htmlFor="status">Fleet status</label><select id="status" name="status" defaultValue={vehicle?.status || "active"}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option><option value="sold">Sold</option></select></div>
      <div className="admin-field"><label htmlFor="odometerKm">Odometer (km)</label><input id="odometerKm" name="odometerKm" type="number" min="0" defaultValue={vehicle?.odometer_km ?? ""} /></div>
      <div className="admin-field"><label htmlFor="acquiredOn">Acquired on</label><input id="acquiredOn" name="acquiredOn" type="date" defaultValue={vehicle?.acquired_on || ""} /></div>
      <div className="admin-field admin-field-full"><label htmlFor="vehicleNotes">Notes</label><textarea id="vehicleNotes" name="notes" defaultValue={vehicle?.notes || ""} placeholder="Ownership, service or operating notes…" /></div>
    </div>
    {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"} role="status">{state.message}</p> : null}
    <div className="admin-form-actions"><button className="admin-primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />} {vehicle ? "Save vehicle" : "Add vehicle"}</button></div>
  </form>;
}
