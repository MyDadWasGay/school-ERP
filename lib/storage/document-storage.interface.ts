export type StorageUploadOptions = {
  contentType?: string;
  originalFilename?: string;
  metadata?: Record<string, string>;
};

export type SignedUrlOptions = {
  expiresInSeconds?: number;
  downloadFilename?: string;
  contentType?: string;
  disposition?: "inline" | "attachment";
};

export type StoredObjectMetadata = {
  key: string;
  sizeBytes: number;
  contentType?: string;
  lastModified: Date;
  sha256Hash?: string;
};

export interface DocumentStorageProvider {
  /**
   * Write data into private storage
   */
  upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: StorageUploadOptions,
  ): Promise<StoredObjectMetadata>;

  /**
   * Read data from private storage
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete data from private storage
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if an object exists in storage
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a short-lived, authenticated signed token/URL for preview or download
   */
  generateSignedToken(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<{ token: string; expiresAt: Date }>;

  /**
   * Verify and parse a signed token for access
   */
  verifySignedToken(
    token: string,
  ): Promise<{ key: string; disposition: "inline" | "attachment"; filename?: string; valid: boolean }>;

  /**
   * Get metadata of a stored object
   */
  getMetadata(key: string): Promise<StoredObjectMetadata | null>;
}
