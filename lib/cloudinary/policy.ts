export function isAllowedUpload(input: { bytes?: number; format?: string; resourceType: string }) {
  const maxBytes = input.resourceType === "image" ? 5_000_000 : input.resourceType === "video" ? 50_000_000 : 25_000_000;
  const allowedFormats = allowedFormatsFor(input.resourceType);
  return (!input.bytes || input.bytes <= maxBytes) && (!input.format || allowedFormats.includes(input.format.toLowerCase()));
}

export function allowedFormatsFor(resourceType: string) {
  if (resourceType === "image") return ["jpg", "jpeg", "png", "webp"];
  if (resourceType === "video") return ["mp4", "webm"];
  return ["pdf", "doc", "docx", "xls", "xlsx", "csv"];
}
