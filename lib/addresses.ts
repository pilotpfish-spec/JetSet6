"use client";

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  createdAt: number; // epoch ms
};

const KEY = "jetsetdirect_saved_addresses";
const MAX_ITEMS = 50;

function now() {
  return Date.now();
}

function makeId() {
  // Safe in browsers; graceful fallback otherwise
  const rnd = (globalThis as any)?.crypto?.randomUUID?.();
  return rnd ?? `id_${Math.random().toString(36).slice(2)}_${now()}`;
}

function isSavedAddress(x: any): x is SavedAddress {
  return (
    x &&
    typeof x === "object" &&
    typeof x.id === "string" &&
    typeof x.label === "string" &&
    typeof x.address === "string" &&
    typeof x.createdAt === "number"
  );
}

function readRaw(): unknown {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRaw(list: SavedAddress[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore quota/serialisation issues
  }
}

/** Return a clean, validated list */
export function listAddresses(): SavedAddress[] {
  const raw = readRaw();
  if (!Array.isArray(raw)) return [];
  const cleaned = raw.filter(isSavedAddress);

  // If anything was invalid, rewrite the cleaned list once
  if (cleaned.length !== (raw as any[]).length) writeRaw(cleaned);
  return cleaned;
}

/** Save a new address (dedupes by exact label+address) */
export function saveAddress(addr: Omit<SavedAddress, "id" | "createdAt">): SavedAddress {
  const list = listAddresses();

  // Prevent exact duplicates
  const exists = list.find(
    (a) => a.label.trim() === addr.label.trim() && a.address.trim() === addr.address.trim()
  );
  if (exists) return exists;

  const item: SavedAddress = {
    id: makeId(),
    createdAt: now(),
    label: addr.label.trim(),
    address: addr.address.trim(),
  };

  const next = [item, ...list].slice(0, MAX_ITEMS);
  writeRaw(next);
  return item;
}

/** Delete by id (no-op if not found) */
export function deleteAddress(id: string) {
  const next = listAddresses().filter((a) => a.id !== id);
  writeRaw(next);
}

/** Optional helpers (handy on the account page) */
export function getAddress(id: string): SavedAddress | undefined {
  return listAddresses().find((a) => a.id === id);
}

export function updateAddress(
  id: string,
  patch: Partial<Pick<SavedAddress, "label" | "address">>
) {
  const list = listAddresses();
  const next = list.map((a) => (a.id === id ? { ...a, ...patch } : a));
  writeRaw(next);
}

export function clearAddresses() {
  writeRaw([]);
}
