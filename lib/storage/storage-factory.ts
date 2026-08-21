import type { DocumentStorageProvider } from "./document-storage.interface";
import { PrivateDiskStorageProvider } from "./disk-storage.service";

let storageInstance: DocumentStorageProvider | null = null;

export function getDocumentStorage(): DocumentStorageProvider {
  if (!storageInstance) {
    storageInstance = new PrivateDiskStorageProvider();
  }
  return storageInstance;
}
