"use client";

import { useState } from "react";
import { saveDocumentMetadataAction } from "@/features/documents/actions/document.actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UploadEntityType } from "@/lib/cloudinary/types";

type SignatureResponse = {
  timestamp: number;
  folder: string;
  type: string;
  allowed_formats: string;
  signature: string;
  apiKey: string;
  cloudName: string;
};

export function FileUploadField({
  label = "Document",
  entityType = "custom",
  entityId,
  category = "general",
  accept,
}: {
  label?: string;
  entityType?: UploadEntityType;
  entityId: string;
  category?: string;
  accept?: string;
}) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setStatus("Requesting secure upload signature…");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const resourceType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "raw";
      const response = await fetch("/api/uploads/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, resourceType, format: extension, bytes: file.size }),
      });
      const signature = await response.json() as SignatureResponse & { error?: string };
      if (!response.ok) throw new Error(signature.error ?? "Upload permission was denied.");
      setStatus(`Uploading ${file.name}…`);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("api_key", signature.apiKey);
      formData.set("timestamp", String(signature.timestamp));
      formData.set("signature", signature.signature);
      formData.set("folder", signature.folder);
      formData.set("type", signature.type);
      formData.set("allowed_formats", signature.allowed_formats);
      const upload = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`, { method: "POST", body: formData });
      const metadata = await upload.json() as Record<string, unknown>;
      if (!upload.ok) throw new Error(typeof metadata.error === "object" ? "Cloudinary rejected the upload." : "Upload failed.");
      const saved = await saveDocumentMetadataAction({
        entityType,
        entityId,
        category,
        publicId: metadata.public_id,
        secureUrl: metadata.secure_url,
        resourceType: metadata.resource_type,
        format: metadata.format,
        bytes: metadata.bytes,
        width: metadata.width,
        height: metadata.height,
        version: metadata.version,
        originalFilename: metadata.original_filename ?? file.name,
      });
      if (!saved.ok) throw new Error(saved.error);
      setStatus("Upload completed securely.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return <div className="space-y-2"><Label htmlFor={`upload-${entityType}-${entityId}`}>{label}</Label><Input id={`upload-${entityType}-${entityId}`} type="file" accept={accept} disabled={pending} onChange={choose} />{status ? <p role="status" className="text-xs text-muted-foreground">{status}</p> : null}</div>;
}
