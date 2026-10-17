export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function validateImageUpload(file: File): Promise<void> {
  if (!file.size) throw new Error("Choose a non-empty image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 16 MB or smaller.");
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const text = new TextDecoder().decode(bytes);
  const webp = text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
  if (!(file.type === "image/png" && png || file.type === "image/jpeg" && jpeg || file.type === "image/webp" && webp)) {
    throw new Error("This file does not contain a valid JPEG, PNG, or WebP image.");
  }
}
