// Images live in Firebase Storage. Firestore documents store only the Storage path
// (e.g. "memories/memory001.jpg"); screens resolve that path to a URL when displaying.
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';

import { storage } from '../../config/firebase';

/** Upload a local file (e.g. from the image picker) to `path`. Returns the path. */
export async function uploadImage(localUri: string, path: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  await uploadBytes(ref(storage, path), blob, { contentType: blob.type || 'image/jpeg' });
  return path;
}

const urlCache = new Map<string, Promise<string | null>>();

/** Download URL for a Storage path, or null if it doesn't exist. Cached per path. */
export function getImageUrl(path: string): Promise<string | null> {
  let url = urlCache.get(path);
  if (!url) {
    url = getDownloadURL(ref(storage, path)).catch(() => null);
    urlCache.set(path, url);
  }
  return url;
}

/** Resolve a Storage path to a URL inside a component. null while loading or if missing. */
export function useImageUrl(path: string | undefined | null): string | null {
  const [resolved, setResolved] = useState<{ path: string; url: string | null } | null>(null);

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
