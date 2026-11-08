/** Shared image uploads on Cloudinary's free tier; existing Firebase Storage paths remain readable. */
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { app } from "../../firebaseConfig";

const CLOUD_NAME = "g7bao980";
const UPLOAD_PRESET = "petcare_unsigned";
const legacyStorage = getStorage(app);

/** Upload an image selected on-device and return its HTTPS URL for Firestore. */
export async function uploadImage(
  localUri: string,
  path: string,
): Promise<string> {
  // Read the local file as Base64 to avoid React Native multipart FormData issues.
  const extension = (
    localUri.split("?")[0].split(".").pop() || "jpg"
  ).toLowerCase();
  const mime =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const dataUri = `data:${mime};base64,${base64}`;
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `file=${encodeURIComponent(dataUri)}&upload_preset=${encodeURIComponent(UPLOAD_PRESET)}`,
    },
  );
  const result: { secure_url?: string; error?: { message?: string } } =
    await response.json();
  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || "Photo upload failed. Please try again.",
    );
  }
  return result.secure_url;
}

const urlCache = new Map<string, Promise<string | null>>();

/** Accept Cloudinary/other HTTPS URLs and resolve old Firebase Storage paths. */
export function getImageUrl(path: string): Promise<string | null> {
  if (/^https?:\/\//i.test(path)) return Promise.resolve(path);
  let url = urlCache.get(path);
  if (!url) {
    url = getDownloadURL(ref(legacyStorage, path)).catch(() => null);
    urlCache.set(path, url);
  }
  return url;
}

export function useImageUrl(path: string | undefined | null): string | null {
  const [resolved, setResolved] = useState<{
    path: string;
    url: string | null;
  } | null>(null);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    getImageUrl(path).then((url) => {
      if (!cancelled) setResolved({ path, url });
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return path && resolved?.path === path ? resolved.url : null;
}
