import { extname } from "node:path";

export const MAX_SUPPORTING_FILE_BYTES = 4 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXTENSION));

export class UnsupportedSupportingFileError extends Error {
  readonly status = 415;

  constructor(message = "Supporting file must be a PDF, JPG, PNG, or HEIC") {
    super(message);
    this.name = "UnsupportedSupportingFileError";
  }
}

export function supportingFileMime(
  originalName: string,
  declaredMime: string,
): string | null {
  const extension = extname(originalName).toLowerCase();
  const fromName = MIME_BY_EXTENSION[extension];
  const declared = declaredMime.toLowerCase();
  if (fromName) {
    if (
      declared === "application/octet-stream" ||
      declared === "" ||
      declared === fromName ||
      ALLOWED_MIME.has(declared)
    ) {
      return fromName;
    }
    return null;
  }
  return ALLOWED_MIME.has(declared) ? declared : null;
}

export function assertSupportingFile(
  originalName: string,
  declaredMime: string,
): string {
  const mime = supportingFileMime(originalName, declaredMime);
  if (!mime) {
    throw new UnsupportedSupportingFileError();
  }
  return mime;
}

export function documentIsRequired(
  requiresDocumentAfterDays: number | null,
  workingDaysCount: number,
): boolean {
  return (
    requiresDocumentAfterDays !== null &&
    workingDaysCount > requiresDocumentAfterDays
  );
}

export function asciiDownloadName(filename: string): string {
  const cleaned = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  return cleaned.trim() || "supporting-file";
}
