export interface StorageCapabilities {
  supportsDirectories: boolean;
  supportsAtomicRename: boolean;
  supportsResume: boolean;
  supportsRandomRead: boolean;
  supportsRandomWrite: boolean;
  supportsMultipartUpload: boolean;
  supportsServerSideCopy: boolean;
  supportsNativeChecksum: boolean;
  supportsMetadata: boolean;
  supportsDelete: boolean;
  supportsVersioning: boolean;
  supportsListing: boolean;
}

export const LOCAL_STORAGE_CAPABILITIES: StorageCapabilities = {
  supportsDirectories: true,
  supportsAtomicRename: true,
  supportsResume: false,
  supportsRandomRead: true,
  supportsRandomWrite: true,
  supportsMultipartUpload: false,
  supportsServerSideCopy: false,
  supportsNativeChecksum: false,
  supportsMetadata: true,
  supportsDelete: true,
  supportsVersioning: false,
  supportsListing: true
};

export const SMB_STORAGE_CAPABILITIES: StorageCapabilities = {
  supportsDirectories: true,
  supportsAtomicRename: true,
  supportsResume: false,
  supportsRandomRead: true,
  supportsRandomWrite: true,
  supportsMultipartUpload: false,
  supportsServerSideCopy: false,
  supportsNativeChecksum: false,
  supportsMetadata: true,
  supportsDelete: true,
  supportsVersioning: false,
  supportsListing: true
};

export const SFTP_STORAGE_CAPABILITIES: StorageCapabilities = {
  supportsDirectories: true,
  supportsAtomicRename: true,
  supportsResume: true,
  supportsRandomRead: true,
  supportsRandomWrite: false,
  supportsMultipartUpload: false,
  supportsServerSideCopy: false,
  supportsNativeChecksum: false,
  supportsMetadata: true,
  supportsDelete: true,
  supportsVersioning: false,
  supportsListing: true
};

export const S3_STORAGE_CAPABILITIES: StorageCapabilities = {
  supportsDirectories: false, // Object storage has flat key hierarchy simulated by prefixes
  supportsAtomicRename: false, // Emulated via Server-Side Copy + Delete
  supportsResume: true, // Resume via Multipart Upload
  supportsRandomRead: true, // HTTP Range requests
  supportsRandomWrite: false,
  supportsMultipartUpload: true,
  supportsServerSideCopy: true,
  supportsNativeChecksum: true, // ETag / SHA256 header verification
  supportsMetadata: true,
  supportsDelete: true,
  supportsVersioning: true,
  supportsListing: true
};
