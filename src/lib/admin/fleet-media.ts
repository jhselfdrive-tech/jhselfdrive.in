import 'server-only';
import { randomUUID } from 'node:crypto';
import { addVehicleDocument, addVehiclePhotos } from './fleet';
import { verifyAdmin } from './auth';
import { DOCUMENTS_BUCKET, removeObjects, uploadObject } from './storage';
import { PHOTOS_BUCKET } from '@/lib/fleet/photos';
import { DOCUMENT_LIMITS, PHOTO_LIMITS, objectKeyForDocument, objectKeyForVehiclePhoto, validateUploads } from '@/lib/uploads/files';
export async function storeVehicleFile(vehicleId: string, file: File, document?: Omit<Parameters<typeof addVehicleDocument>[0], 'vehicleId'>) {
  await verifyAdmin();
  const checked = validateUploads([file], { ...(document ? DOCUMENT_LIMITS : PHOTO_LIMITS), maxFiles: 1 });
  if (!checked.ok) throw Object.assign(new Error(checked.errors[0]), { status: 400 });
  const id = randomUUID();
  const path = document ? objectKeyForDocument(vehicleId,id,file.type) : objectKeyForVehiclePhoto(vehicleId,id,file.type);
  const bucket = document ? DOCUMENTS_BUCKET : PHOTOS_BUCKET;
  await uploadObject(bucket,path,await file.arrayBuffer(),file.type);
  try {
    const meta = { id,filePath:path,fileName:file.name,fileMime:file.type,fileSizeBytes:file.size };
    if (document) await addVehicleDocument({ ...document,...meta,vehicleId });
    else await addVehiclePhotos(vehicleId,[meta]);
  } catch (error) {
    await removeObjects(bucket,[path]).catch(cleanup => console.error('Vehicle media rollback failed',{ bucket,path,cleanup }));
    throw error;
  }
  return id;
}
