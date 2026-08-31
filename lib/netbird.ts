export type NetBirdIdentity = {
  user: string;
  groups: string[];
  isImageGenAdmin: boolean;
};

const ADMIN_GROUP = "ImageGen-Admin";

function parseGroups(value: string | null): string[] {
  if (!value?.trim()) return [];
  const trimmed = value.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((group): group is string => typeof group === "string").map((group) => group.trim()).filter(Boolean);
      }
    } catch {
      // Fall through to the delimiter-based format.
    }
  }

  return trimmed.split(/[,;\n]+/).map((group) => group.trim()).filter(Boolean);
}

export function parseNetBirdGroups(values: Array<string | null>): string[] {
  return [...new Set(values.flatMap(parseGroups))];
}

export function getNetBirdIdentity(headers: Pick<Headers, "get">): NetBirdIdentity {
  const user = headers.get("x-netbird-user")?.trim() || "";
  // NetBird documents the plural header, while this deployment also forwards
  // the singular X-NetBird-Group form. Accept both without trusting a client
  // supplied fallback identity.
  const groups = parseNetBirdGroups([headers.get("x-netbird-group"), headers.get("x-netbird-groups")]);
  return { user, groups, isImageGenAdmin: groups.includes(ADMIN_GROUP) };
}

export function hasNetBirdIdentity(identity: NetBirdIdentity): boolean {
  return Boolean(identity.user);
}
