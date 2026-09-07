import { Camera, FileImage, Trash2 } from "lucide-react";
import { deleteBookingMediaAction } from "@/app/admin/actions/handovers";
import type { BookingMedia, HandoverPhase } from "@/lib/admin/bookings";
import { MediaUploadForm } from "./MediaUploadForm";
import { RestrictedLicenceMedia } from "./RestrictedLicenceMedia";

function ConditionFiles({ files }: { files: BookingMedia[] }) {
  return <div className="admin-condition-grid">{files.map((file) => <article className="admin-condition-file" key={file.id}>
    {file.signedUrl && file.file_mime.startsWith("image/") ? <a className="admin-condition-preview" href={file.signedUrl} target="_blank" rel="noreferrer" style={{ backgroundImage: `url(${file.signedUrl})` }} aria-label={`Open ${file.file_name}`} /> : <a className="admin-condition-placeholder" href={file.signedUrl || "#"} target="_blank" rel="noreferrer"><FileImage size={20} /></a>}
    <div><strong>{file.file_name}</strong><small>{Math.ceil(file.file_size_bytes / 1024)} KB</small></div>
    <form action={deleteBookingMediaAction}><input type="hidden" name="id" value={file.id} /><button className="admin-icon-button" type="submit" title="Delete file"><Trash2 size={13} /></button></form>
  </article>)}</div>;
}

export function BookingMediaPanel({ bookingId, media }: { bookingId: string; media: BookingMedia[] }) {
  return <section className="admin-card admin-booking-media">
    <div className="admin-card-head"><div><h2>Handover media</h2><span className="admin-card-subtitle">Condition evidence and separately protected licence files</span></div><Camera size={18} /></div>
    {(["delivery", "return"] as HandoverPhase[]).map((phase) => {
      const phaseMedia = media.filter((item) => item.phase === phase);
      const conditions = phaseMedia.filter((item) => item.media_type === "vehicle_condition");
      const licences = phaseMedia.filter((item) => item.media_type.startsWith("licence"));
      const front = licences.find((item) => item.media_type === "licence_front");
      const back = licences.find((item) => item.media_type === "licence_back");
      return <div className="admin-media-phase" key={phase}>
        <div className="admin-media-phase-head"><strong>{phase === "delivery" ? "Delivery" : "Return"}</strong><span>{conditions.length} condition photo{conditions.length === 1 ? "" : "s"}</span></div>
        <ConditionFiles files={conditions} />
        {!conditions.length ? <p className="admin-empty-copy">No condition evidence recorded for this phase.</p> : null}
        <div className="admin-media-form-grid">
          <MediaUploadForm bookingId={bookingId} phase={phase} mediaType="vehicle_condition" />
          {phase === "delivery" ? <><MediaUploadForm bookingId={bookingId} phase={phase} mediaType="licence_front" disabled={Boolean(front)} /><MediaUploadForm bookingId={bookingId} phase={phase} mediaType="licence_back" disabled={Boolean(back)} /></> : null}
        </div>
        {phase === "delivery" ? <RestrictedLicenceMedia files={licences.map((file) => ({ id: file.id, label: file.media_type === "licence_front" ? "front" : "back" }))} /> : null}
        {licences.length ? <div className="admin-restricted-delete">{licences.map((file) => <form action={deleteBookingMediaAction} key={file.id}><input type="hidden" name="id" value={file.id} /><button className="admin-text-button" type="submit"><Trash2 size={12} /> Delete licence {file.media_type === "licence_front" ? "front" : "back"}</button></form>)}</div> : null}
      </div>;
    })}
  </section>;
}
