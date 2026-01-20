import { del, put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const assertBlobSize = (size: number) => {
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds 10MB limit");
  }
};

export const uploadBlob = async (path: string, file: File) => {
  assertBlobSize(file.size);
  return put(path, file, {
    access: "public",
    addRandomSuffix: true,
  });
};

export const deleteBlob = async (url: string) => del(url);
