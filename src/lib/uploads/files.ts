export type UploadDescriptor = { name: string; size: number; type: string };
export type UploadLimits = { maxFiles: number; maxBytes: number; allowedMime: readonly string[] };

export const DOCUMENT_LIMITS: UploadLimits = { maxFiles: 1, maxBytes: 12 * 1024 * 1024, allowedMime: ["application/pdf", "image/jpeg", "image/png", "image/webp"] };
export const MEDIA_LIMITS: UploadLimits = { maxFiles: 6, maxBytes: 8 * 1024 * 1024, allowedMime: ["application/pdf", "image/jpeg", "image/png", "image/webp"] };

export function validateUploads(files: UploadDescriptor[], limits: UploadLimits) {
  const errors: string[] = [];
  if (!files.length) errors.push("Choose at least one file.");
  if (files.length > limits.maxFiles) errors.push(`Upload no more than ${limits.maxFiles} file${limits.maxFiles === 1 ? "" : "s"}.`);
  files.forEach((file) => {
    if (file.size <= 0) errors.push(`${file.name || "File"} is empty.`);
    if (file.size > limits.maxBytes) errors.push(`${file.name || "File"} exceeds ${Math.round(limits.maxBytes / 1024 / 1024)}MB.`);
    if (!limits.allowedMime.includes(file.type)) errors.push(`${file.name || "File"} has an unsupported format.`);
  });
  return { ok: errors.length === 0, errors };
}

export function extensionFor(mime: string) {
  const extensions: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  return extensions[mime] || "bin";
}

export function objectKeyForDocument(vehicleId: string, documentId: string, mime: string) {
  return `vehicles/${vehicleId}/${documentId}.${extensionFor(mime)}`;
}

export function objectKeyForMedia(bookingId: string, phase: string, mediaType: string, mediaId: string, mime: string) {
  return `bookings/${bookingId}/${phase}/${mediaType}/${mediaId}.${extensionFor(mime)}`;
}
