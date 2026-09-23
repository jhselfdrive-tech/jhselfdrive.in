import 'server-only';
import { randomUUID } from 'node:crypto';
import { addBookingMedia, getBookingMediaContext, type HandoverPhase, type BookingMediaType } from './bookings';
import { DOCUMENTS_BUCKET, IDENTITY_BUCKET, uploadObject, removeObjects } from './storage';
import { MEDIA_LIMITS, validateUploads, objectKeyForMedia } from '@/lib/uploads/files';
/** One upload pipeline for web and native, including rollback of an uploaded object. */
export async function storeBookingMedia(input: { bookingId: string; phase: HandoverPhase; mediaType: BookingMediaType; file: File }) {
  const { bookingId, phase, mediaType, file } = input;
  const checked = validateUploads([file], { ...MEDIA_LIMITS, maxFiles: 1 });
  if (!checked.ok) throw Object.assign(new Error(checked.errors[0]), { status: 400 });
  const context = await getBookingMediaContext(bookingId);
  const purgeAfter = new Date(new Date(context.end_at).getTime() + 90 * 86_400_000).toISOString().slice(0, 10);
  const bucket = mediaType === 'vehicle_condition' ? DOCUMENTS_BUCKET : IDENTITY_BUCKET;
  const id = randomUUID(), path = objectKeyForMedia(bookingId, phase, mediaType, id, file.type);
  await uploadObject(bucket, path, await file.arrayBuffer(), file.type);
  try {
    await addBookingMedia({ id, booking_id: bookingId, phase, media_type: mediaType, bucket_id: bucket, file_path: path, file_name: file.name, file_mime: file.type, file_size_bytes: file.size, purge_after: purgeAfter });
  } catch (error) {
    await removeObjects(bucket, [path]).catch(cleanup => console.error('Media rollback failed', { bucket, path, cleanup }));
    if (mediaType !== 'vehicle_condition' && (error as { code?: string }).code === '23505') throw Object.assign(new Error('LICENCE_SLOT_OCCUPIED'), { code: 'LICENCE_SLOT_OCCUPIED' });
    throw error;
  }
  return id;
}
