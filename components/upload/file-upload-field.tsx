"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UploadEntityType } from "@/lib/cloudinary/types";
import { createBrowserApiClient } from "@/lib/api-client/browser";

export function FileUploadField({
  label = "Document",
  entityType = "custom",
  entityId,
  category = "general",
  accept,
  campusId,
}: {
  label?: string;
  entityType?: UploadEntityType;
  entityId: string;
  category?: string;
  accept?: string;
  campusId?: string;
}) {
  const router = useRouter();
  const api = useMemo(() => createBrowserApiClient(campusId), [campusId]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true);
    setStatus("Requesting secure upload signature…");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const resourceType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "raw";
      const signature = await api.createUploadSignature({
        entityType,
        entityId,
        resourceType,
        format: extension,
        bytes: file.size,
      });
      setStatus(`Uploading ${file.name}…`);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("api_key", signature.apiKey);
      formData.set("timestamp", String(signature.timestamp));
      formData.set("signature", signature.signature);
      formData.set("folder", signature.folder);
      formData.set("type", signature.type);
      formData.set("allowed_formats", signature.allowed_formats);
      const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
        { method: "POST", body: formData },
      );
      const metadata = (await upload.json()) as Record<string, unknown>;
      if (!upload.ok)
        throw new Error(
          typeof metadata.error === "object"
            ? "Cloudinary rejected the upload."
            : "Upload failed.",
        );
      const publicId = requiredString(
        metadata.public_id,
        "Cloudinary did not return a public ID.",
      );
      const secureUrl = requiredString(
        metadata.secure_url,
        "Cloudinary did not return a secure URL.",
      );
      const uploadedResourceType = metadata.resource_type;
      if (
        uploadedResourceType !== "image" &&
        uploadedResourceType !== "raw" &&
        uploadedResourceType !== "video"
      ) {
        throw new Error("Cloudinary returned an unsupported resource type.");
      }
      await api.saveDocumentMetadata({
        entityType,
        entityId,
        category,
        publicId,
        secureUrl,
        resourceType: uploadedResourceType,
        format: optionalString(metadata.format),
        bytes: optionalNumber(metadata.bytes),
        width: optionalNumber(metadata.width),
        height: optionalNumber(metadata.height),
        version: optionalNumber(metadata.version),
        originalFilename:
          optionalString(metadata.original_filename) ?? file.name,
      });
      setStatus("Upload completed securely.");
      event.target.value = "";
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`upload-${entityType}-${entityId}`}>{label}</Label>
      <Input
        id={`upload-${entityType}-${entityId}`}
        type="file"
        accept={accept}
        disabled={pending}
        onChange={choose}
      />
      {status ? (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function requiredString(value: unknown, message: string) {
  if (typeof value !== "string" || !value) throw new Error(message);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
