import type { NetBirdIdentity } from "./netbird";

export type GenerateRequest = {
  prompt: string;
  aspectRatio: string;
  quality: string;
  imageUrls: string[];
  owner: string;
};

export function normalizeGenerateRequest(body: unknown, identity: NetBirdIdentity): GenerateRequest {
  const input = (body && typeof body === "object" ? body : {}) as { prompt?: unknown; imageUrls?: unknown; aspectRatio?: unknown; quality?: unknown };
  const imageUrls = Array.isArray(input.imageUrls) ? input.imageUrls.filter((url): url is string => typeof url === "string").slice(0, 5) : [];
  return {
    prompt: typeof input.prompt === "string" ? input.prompt.trim() : "",
    aspectRatio: typeof input.aspectRatio === "string" && input.aspectRatio ? input.aspectRatio : "1:1",
    quality: typeof input.quality === "string" && input.quality ? input.quality : "auto",
    imageUrls,
    owner: identity.user,
  };
}
