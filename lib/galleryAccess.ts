import type { NetBirdIdentity } from "./netbird";

export type OwnedMediaRecord = { owner?: string };

export function canAccessOwnedRecord(record: OwnedMediaRecord, identity: NetBirdIdentity): boolean {
  return identity.isImageGenAdmin || (Boolean(identity.user) && record.owner === identity.user);
}
