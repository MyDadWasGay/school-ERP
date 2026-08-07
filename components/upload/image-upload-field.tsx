import { FileUploadField } from "./file-upload-field";
import type { UploadEntityType } from "@/lib/cloudinary/types";
export function ImageUploadField({ entityType = "student", entityId }: { entityType?: UploadEntityType; entityId: string }) { return <FileUploadField label="Photo" entityType={entityType} entityId={entityId} category="photo" accept="image/jpeg,image/png,image/webp" />; }
