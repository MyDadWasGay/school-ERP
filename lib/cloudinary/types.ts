export type UploadEntityType = "student" | "employee" | "application" | "certificate" | "library_item" | "asset" | "cms_media" | "health_record" | "custom";
export type CloudinaryUploadMetadata = { publicId: string; secureUrl: string; resourceType: "image" | "raw" | "video"; format?: string; bytes?: number; width?: number; height?: number; originalFilename?: string };
