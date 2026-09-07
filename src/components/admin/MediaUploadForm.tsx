"use client";

import { useActionState } from "react";
import { Camera, LoaderCircle, Upload } from "lucide-react";
import { uploadBookingMediaAction, type HandoverActionState } from "@/app/admin/actions/handovers";
import type { BookingMediaType, HandoverPhase } from "@/lib/admin/bookings";

const labels: Record<BookingMediaType, string> = {
  licence_front: "Licence front",
  licence_back: "Licence back",
  vehicle_condition: "Condition photos",
};

export function MediaUploadForm({ bookingId, phase, mediaType, disabled = false }: { bookingId: string; phase: HandoverPhase; mediaType: BookingMediaType; disabled?: boolean }) {
  const [state, action, pending] = useActionState(uploadBookingMediaAction, {} as HandoverActionState);
  const multiple = mediaType === "vehicle_condition";
  return <form action={action} className="admin-media-upload">
    <input type="hidden" name="bookingId" value={bookingId} />
    <input type="hidden" name="phase" value={phase} />
    <input type="hidden" name="mediaType" value={mediaType} />
    <div className="admin-media-upload-title"><Camera size={15} /><strong>{labels[mediaType]}</strong></div>
    <div className="admin-field">
      <label htmlFor={`${phase}-${mediaType}`}>{multiple ? "Up to 6 images" : "One image or PDF"}</label>
      <input id={`${phase}-${mediaType}`} name="files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple={multiple} required disabled={disabled || pending} />
      <small>Maximum 8 MB per file.</small>
    </div>
    <button className="admin-secondary-button" type="submit" disabled={disabled || pending}>
      {pending ? <LoaderCircle className="animate-spin" size={14} /> : <Upload size={14} />} Upload
    </button>
    {disabled ? <small className="admin-field-warning">Delete the current file before replacing it.</small> : null}
    {state.message ? <small className={state.success ? "admin-field-success" : "admin-field-warning"}>{state.message}</small> : null}
  </form>;
}
