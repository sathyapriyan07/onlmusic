import { supabase } from "./supabaseClient";

export function getPublicImageUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export function resolveImageSrc(opts: {
  url?: string | null;
  bucket: string;
  filePath?: string | null;
  fallback?: string;
}): string {
  if (opts.url) return opts.url;
  if (opts.filePath) return getPublicImageUrl(opts.bucket, opts.filePath);
  return opts.fallback ?? "";
}

