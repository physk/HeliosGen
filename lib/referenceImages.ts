export type ReferenceImage = { id: string; url: string; uploading?: boolean; error?: string };

export function addReferenceImage(current: ReferenceImage[], url: string, maxCount = 5): ReferenceImage[] {
  if (!url || current.length >= maxCount || current.some((reference) => reference.url === url)) return current;
  return [...current, { id: `${url}-${Date.now()}`, url }];
}
