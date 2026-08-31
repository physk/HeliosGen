import { describe, expect, it } from "vitest";
import { canAccessOwnedRecord } from "../lib/galleryAccess";
import { normalizeGenerateRequest } from "../lib/generationRequest";
import { addReferenceImage, type ReferenceImage } from "../lib/referenceImages";
import { getNetBirdIdentity, parseNetBirdGroups } from "../lib/netbird";

const identity = (user: string, groups: string[] = []) => ({ user, groups, isImageGenAdmin: groups.includes("ImageGen-Admin") });

describe("NetBird identity", () => {
  it("parses the deployment header and the official plural header format", () => {
    expect(parseNetBirdGroups(["Artists, ImageGen-Admin", "Editors"])).toEqual(["Artists", "ImageGen-Admin", "Editors"]);
    expect(parseNetBirdGroups(['["Artists", "ImageGen-Admin"]'])).toEqual(["Artists", "ImageGen-Admin"]);
    expect(getNetBirdIdentity(new Headers({ "X-NetBird-User": "alice@example.com", "X-NetBird-Group": "Artists; ImageGen-Admin" }))).toEqual({ user: "alice@example.com", groups: ["Artists", "ImageGen-Admin"], isImageGenAdmin: true });
  });
});

describe("gallery ownership", () => {
  const own = { owner: "alice@example.com", prompt: "alice prompt" };
  const other = { owner: "bob@example.com", prompt: "bob prompt" };
  const legacy = { owner: undefined as string | undefined, prompt: "legacy prompt" };

  it("lets a normal user see only their own images", () => {
    const viewer = identity("alice@example.com");
    expect(canAccessOwnedRecord(own, viewer)).toBe(true);
    expect(canAccessOwnedRecord(other, viewer)).toBe(false);
    expect(canAccessOwnedRecord(legacy, viewer)).toBe(false);
  });

  it("lets ImageGen-Admin see all images, including legacy ownerless records", () => {
    const admin = identity("admin@example.com", ["ImageGen-Admin"]);
    expect([own, other, legacy].filter((record) => canAccessOwnedRecord(record, admin))).toHaveLength(3);
  });

  it("uses the trusted identity for ownership and ignores a client owner field", () => {
    const request = normalizeGenerateRequest({ prompt: "test", owner: "attacker@example.com" }, identity("alice@example.com"));
    expect(request.owner).toBe("alice@example.com");
    expect(request).not.toHaveProperty("clientOwner");
  });

  it("keeps prompts available only through authorized records", () => {
    const visible = [own, other].filter((record) => canAccessOwnedRecord(record, identity("alice@example.com")));
    expect(visible.map((record) => record.prompt)).toEqual(["alice prompt"]);
  });
});

describe("gallery image references", () => {
  it("converts a generated gallery URL into the existing reference representation", () => {
    const current: ReferenceImage[] = [];
    const next = addReferenceImage(current, "/api/media/images/generated.png");
    expect(next).toHaveLength(1);
    expect(next[0].url).toBe("/api/media/images/generated.png");
  });

  it("does not add duplicates and respects the maximum", () => {
    const first = addReferenceImage([], "/one.png");
    expect(addReferenceImage(first, "/one.png")).toBe(first);
    const full = ["/a.png", "/b.png"].map((url, index) => ({ id: String(index), url }));
    expect(addReferenceImage(full, "/c.png", 2)).toBe(full);
  });
});
