import { describe, expect, it } from "vitest";
import { MEDIA_LIMITS, extensionFor, objectKeyForDocument, objectKeyForMedia, validateUploads } from "./files";

describe("upload validation", () => {
  it("rejects empty, oversized, unsupported and excess files", () => {
    expect(validateUploads([{ name: "empty.jpg", size: 0, type: "image/jpeg" }], MEDIA_LIMITS).ok).toBe(false);
    expect(validateUploads([{ name: "large.jpg", size: MEDIA_LIMITS.maxBytes + 1, type: "image/jpeg" }], MEDIA_LIMITS).errors[0]).toContain("exceeds");
    expect(validateUploads([{ name: "clip.mp4", size: 100, type: "video/mp4" }], MEDIA_LIMITS).errors[0]).toContain("unsupported");
    expect(validateUploads(Array.from({ length: 7 }, (_, index) => ({ name: `${index}.jpg`, size: 100, type: "image/jpeg" })), MEDIA_LIMITS).errors[0]).toContain("no more than 6");
  });

  it("accepts valid images and creates scoped object keys", () => {
    expect(validateUploads([{ name: "condition.webp", size: 1024, type: "image/webp" }], MEDIA_LIMITS)).toEqual({ ok: true, errors: [] });
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(objectKeyForDocument("vehicle", "document", "application/pdf")).toBe("vehicles/vehicle/document.pdf");
    expect(objectKeyForMedia("booking", "delivery", "vehicle_condition", "media", "image/png")).toBe("bookings/booking/delivery/vehicle_condition/media.png");
  });
});
