"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { deleteVehicleAction, saveVehicleAction, type FleetActionState } from "@/app/admin/actions/fleet";
import { site } from "@/content/site";
import type { Vehicle, VehiclePhoto } from "@/lib/admin/fleet";
import { Modal } from "./Modal";
import { VehiclePhotoManager } from "./VehiclePhotoManager";

type Props = {
  vehicle?: Vehicle | null;
  photos?: VehiclePhoto[];
  trigger?: "primary" | "secondary";
  label?: string;
};

function DeleteVehicle({ vehicleId, onDeleted }: { vehicleId: string; onDeleted: () => void }) {
  const [state, action, pending] = useActionState(deleteVehicleAction, {} as FleetActionState);
  const [confirming, setConfirming] = useState(false);
  const handled = useRef(false);

  // onDeleted navigates, so it must fire exactly once — the inline arrow in the
  // parent would otherwise re-trigger this effect on every render.
  useEffect(() => {
    if (state.success && !handled.current) { handled.current = true; onDeleted(); }
  }, [state.success, onDeleted]);

  if (!confirming) {
    return <div className="admin-danger-zone">
      {state.message ? <p className="admin-form-error" role="alert">{state.message}</p> : null}
      <button type="button" className="admin-danger-button" onClick={() => setConfirming(true)}><Trash2 size={14} /> Delete vehicle</button>
    </div>;
  }
  return <form action={action} className="admin-danger-zone">
    <input type="hidden" name="vehicleId" value={vehicleId} />
    <p>Delete this vehicle and its photos permanently? A vehicle with booking history cannot be deleted — retire it instead.</p>
    {state.message ? <p className="admin-form-error" role="alert">{state.message}</p> : null}
    <div className="admin-form-actions">
      <button type="button" className="admin-secondary-button" onClick={() => setConfirming(false)}>Keep it</button>
      <button className="admin-danger-button" type="submit" disabled={pending}>
        {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete permanently
      </button>
    </div>
  </form>;
}

export function VehicleDialog({ vehicle, photos = [], trigger = "primary", label }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveVehicleAction, {} as FleetActionState);

  // A brand-new vehicle has no id until details are saved, and the photo
  // object key needs one — so the photo step only unlocks after the save.
  const savedId = vehicle?.id || (state.success ? state.vehicleId : undefined);
  const isEditing = Boolean(vehicle);

  useEffect(() => { if (state.success) router.refresh(); }, [state.success, state.vehicleId, router]);

  const close = () => { setOpen(false); if (state.success) router.refresh(); };

  return <>
    <button type="button" className={trigger === "primary" ? "admin-primary-button" : "admin-secondary-button"} onClick={() => setOpen(true)}>
      {isEditing ? <Save size={15} /> : <Plus size={15} />} {label || (isEditing ? "Edit vehicle" : "Add vehicle")}
    </button>

    <Modal
      open={open}
      onClose={close}
      size="large"
      title={isEditing ? `Edit ${vehicle?.display_name || vehicle?.registration_number}` : "Add a vehicle"}
      subtitle="Details and rates are what customers see when they search for dates."
    >
      <form action={action} className="admin-modal-form">
        {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}

        <h3 className="admin-modal-section">Identity</h3>
        <div className="admin-form-grid">
          <div className="admin-field"><label htmlFor="registrationNumber">Registration number</label><input id="registrationNumber" name="registrationNumber" defaultValue={vehicle?.registration_number || ""} placeholder="TN65AB1234" required /></div>
          <div className="admin-field"><label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" defaultValue={vehicle?.display_name || ""} placeholder="White Ertiga" /></div>
          <div className="admin-field"><label htmlFor="categorySlug">Public category</label><select id="categorySlug" name="categorySlug" defaultValue={vehicle?.category_slug || site.fleet[0].slug}>{site.fleet.map((car) => <option value={car.slug} key={car.slug}>{car.name}</option>)}</select></div>
          <div className="admin-field"><label htmlFor="model">Model</label><input id="model" name="model" defaultValue={vehicle?.model || ""} placeholder="Maruti Suzuki Ertiga" /></div>
          <div className="admin-field"><label htmlFor="year">Year</label><input id="year" name="year" type="number" min="1980" max="2100" defaultValue={vehicle?.year || ""} /></div>
          <div className="admin-field"><label htmlFor="seats">Seats</label><input id="seats" name="seats" type="number" min="1" max="60" defaultValue={vehicle?.seats || ""} /></div>
          <div className="admin-field"><label htmlFor="transmission">Transmission</label><select id="transmission" name="transmission" defaultValue={vehicle?.transmission || "Manual"}><option>Manual</option><option>Automatic</option><option>AMT</option><option>CVT</option></select></div>
          <div className="admin-field"><label htmlFor="fuel">Fuel</label><select id="fuel" name="fuel" defaultValue={vehicle?.fuel || "Petrol"}><option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option><option>Hybrid</option></select></div>
        </div>

        <h3 className="admin-modal-section">Rates &amp; availability</h3>
        <div className="admin-form-grid">
          <div className="admin-field"><label htmlFor="dayRate">Day rate (₹)</label><input id="dayRate" name="dayRate" type="number" min="0" step="1" defaultValue={vehicle?.day_rate ?? 1800} required /></div>
          <div className="admin-field"><label htmlFor="deposit">Refundable deposit (₹)</label><input id="deposit" name="deposit" type="number" min="0" step="1" defaultValue={vehicle?.deposit ?? 5000} required /></div>
          <div className="admin-field"><label htmlFor="kmRate">Extra km rate (₹)</label><input id="kmRate" name="kmRate" type="number" min="0" step="1" defaultValue={vehicle?.km_rate ?? ""} /></div>
          <div className="admin-field"><label htmlFor="includedKmPerDay">Included km per day</label><input id="includedKmPerDay" name="includedKmPerDay" type="number" min="0" step="1" defaultValue={vehicle?.included_km_per_day ?? 250} /></div>
          <div className="admin-field"><label htmlFor="status">Fleet status</label><select id="status" name="status" defaultValue={vehicle?.status || "active"}><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option><option value="sold">Sold</option></select></div>
          <div className="admin-field admin-field-checkbox">
            <label htmlFor="isBookable">
              <input id="isBookable" name="isBookable" type="checkbox" defaultChecked={vehicle ? vehicle.is_bookable : true} />
              Show on the website
            </label>
            <small>Uncheck to keep the car in the fleet but hide it from customer search.</small>
          </div>
        </div>

        <h3 className="admin-modal-section">Description &amp; records</h3>
        <div className="admin-form-grid">
          <div className="admin-field admin-field-full"><label htmlFor="tagline">Tagline</label><input id="tagline" name="tagline" defaultValue={vehicle?.tagline || ""} placeholder="Roomy 7-seater for family trips" maxLength={120} /></div>
          <div className="admin-field admin-field-full"><label htmlFor="description">Customer description</label><textarea id="description" name="description" defaultValue={vehicle?.description || ""} placeholder="What makes this car a good choice…" /></div>
          <div className="admin-field"><label htmlFor="odometerKm">Odometer (km)</label><input id="odometerKm" name="odometerKm" type="number" min="0" defaultValue={vehicle?.odometer_km ?? ""} /></div>
          <div className="admin-field"><label htmlFor="acquiredOn">Acquired on</label><input id="acquiredOn" name="acquiredOn" type="date" defaultValue={vehicle?.acquired_on || ""} /></div>
          <div className="admin-field admin-field-full"><label htmlFor="vehicleNotes">Internal notes</label><textarea id="vehicleNotes" name="notes" defaultValue={vehicle?.notes || ""} placeholder="Ownership, service or operating notes…" /></div>
        </div>

        {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"} role="status">{state.success ? <CheckCircle2 size={14} /> : null} {state.message}</p> : null}
        <div className="admin-form-actions">
          <button className="admin-primary-button" type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />} {isEditing ? "Save vehicle" : "Save details"}
          </button>
        </div>
      </form>

      <h3 className="admin-modal-section">Photos</h3>
      {savedId
        ? <VehiclePhotoManager vehicleId={savedId} photos={photos} />
        : <p className="admin-empty">Save the vehicle details first — photos are filed against the saved car.</p>}

      {vehicle ? <DeleteVehicle vehicleId={vehicle.id} onDeleted={() => { setOpen(false); router.push("/admin/fleet"); router.refresh(); }} /> : null}
    </Modal>
  </>;
}
