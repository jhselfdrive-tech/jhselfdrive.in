"use client";

import { useActionState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import {
  addVehiclePhotosAction,
  deleteVehiclePhotoAction,
  reorderVehiclePhotosAction,
  type FleetActionState,
} from "@/app/admin/actions/fleet";
import { PHOTO_LIMITS } from "@/lib/uploads/files";
import type { VehiclePhoto } from "@/lib/admin/fleet";

function Feedback({ state }: { state: FleetActionState }) {
  if (!state.message) return null;
  return <p className={state.success ? "admin-form-success" : "admin-form-error"} role="status">{state.message}</p>;
}

/** Moves one photo left or right and submits the whole resulting order. */
function MoveButton({ photos, index, delta, label, icon }: { photos: VehiclePhoto[]; index: number; delta: number; label: string; icon: React.ReactNode }) {
  const [state, action, pending] = useActionState(reorderVehiclePhotosAction, {} as FleetActionState);
  const next = [...photos];
  const [moved] = next.splice(index, 1);
  next.splice(index + delta, 0, moved);
  return <form action={action} style={{ display: "contents" }}>
    <input type="hidden" name="vehicleId" value={photos[index].vehicle_id} />
    <input type="hidden" name="order" value={next.map((photo) => photo.id).join(",")} />
    <button className="admin-icon-button" type="submit" disabled={pending} title={label} aria-label={label}>{icon}</button>
    {state.message && !state.success ? <span className="admin-visually-hidden">{state.message}</span> : null}
  </form>;
}

function DeleteButton({ photoId }: { photoId: string }) {
  const [, action, pending] = useActionState(deleteVehiclePhotoAction, {} as FleetActionState);
  return <form action={action} style={{ display: "contents" }}>
    <input type="hidden" name="photoId" value={photoId} />
    <button className="admin-icon-button admin-icon-button-danger" type="submit" disabled={pending} title="Remove photo" aria-label="Remove photo">
      {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
  </form>;
}

export function VehiclePhotoManager({ vehicleId, photos }: { vehicleId: string; photos: VehiclePhoto[] }) {
  const [state, action, pending] = useActionState(addVehiclePhotosAction, {} as FleetActionState);
  const maxMb = Math.round(PHOTO_LIMITS.maxBytes / 1024 / 1024);

  return <div className="admin-photo-manager">
    <div className="admin-photo-grid">
      {photos.map((photo, index) => <figure className="admin-photo-tile" key={photo.id}>
        {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs, sized by CSS */}
        {photo.url ? <img src={photo.url} alt={photo.file_name || "Vehicle photo"} loading="lazy" /> : <div className="admin-photo-missing">Missing file</div>}
        {index === 0 ? <span className="admin-photo-primary"><Star size={11} /> Cover</span> : null}
        <figcaption>
          {index > 0 ? <MoveButton photos={photos} index={index} delta={-1} label="Move earlier" icon={<ArrowLeft size={13} />} /> : null}
          {index < photos.length - 1 ? <MoveButton photos={photos} index={index} delta={1} label="Move later" icon={<ArrowRight size={13} />} /> : null}
          <DeleteButton photoId={photo.id} />
        </figcaption>
      </figure>)}
      {!photos.length ? <p className="admin-empty">No photos yet. The first photo becomes the cover customers see.</p> : null}
    </div>

    <form action={action} className="admin-media-upload">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <label htmlFor={`photos-${vehicleId}`}><ImagePlus size={16} /> Choose photos</label>
      <input id={`photos-${vehicleId}`} type="file" name="photos" accept={PHOTO_LIMITS.allowedMime.join(",")} multiple required />
      <small>Up to {PHOTO_LIMITS.maxFiles} images, {maxMb}MB each. JPEG, PNG or WebP.</small>
      <Feedback state={state} />
      <button className="admin-secondary-button" type="submit" disabled={pending}>
        {pending ? <><LoaderCircle size={14} className="animate-spin" /> Uploading…</> : "Upload photos"}
      </button>
    </form>
  </div>;
}
