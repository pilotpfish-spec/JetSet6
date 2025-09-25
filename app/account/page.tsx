"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProfilePayload = {
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  defaultTripType?: "toAirport" | "fromAirport" | "pointToPoint" | null;
};

export default function AccountPage() {
  const { status, data } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    defaultTripType: "toAirport",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (status !== "authenticated") return;
      setLoading(true);
      setError(null);
      setSaved(false);
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/user ${res.status}`);
        const u = await res.json();
        if (!cancelled) {
          setForm({
            name: u?.name ?? data?.user?.name ?? "",
            email: u?.email ?? data?.user?.email ?? "",
            phone: u?.phone ?? "",
            addressLine1: u?.addressLine1 ?? "",
            addressLine2: u?.addressLine2 ?? "",
            city: u?.city ?? "",
            state: u?.state ?? "",
            postalCode: u?.postalCode ?? "",
            defaultTripType:
              u?.defaultTripType === "fromAirport" ||
              u?.defaultTripType === "pointToPoint"
                ? u.defaultTripType
                : "toAirport",
          });
        }
      } catch {
        if (!cancelled) setError("Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [status, data?.user?.name, data?.user?.email]);

  if (status === "unauthenticated") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Account</h1>
        <p>You’re not signed in.</p>
        <button onClick={() => signIn("google")}>Sign in with Google</button>
      </div>
    );
  }

  const onChange = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const payload: ProfilePayload = {
      phone: form.phone || null,
      addressLine1: form.addressLine1 || null,
      addressLine2: form.addressLine2 || null,
      city: form.city || null,
      state: form.state || null,
      postalCode: form.postalCode || null,
      defaultTripType: form.defaultTripType || null,
    };
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`PUT /api/user ${res.status}`);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1>Account</h1>
      <Link href="/account/bookings">Your bookings →</Link>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {saved && <div style={{ color: "green" }}>Saved!</div>}
      <form onSubmit={onSave} style={{ marginTop: 16 }}>
        <input value={form.name} readOnly placeholder="Name" />
        <input value={form.email} readOnly placeholder="Email" />
        <input value={form.phone} onChange={onChange("phone")} placeholder="Phone" />
        <input value={form.addressLine1} onChange={onChange("addressLine1")} placeholder="Address line 1" />
        <input value={form.addressLine2} onChange={onChange("addressLine2")} placeholder="Address line 2" />
        <input value={form.city} onChange={onChange("city")} placeholder="City" />
        <input value={form.state} onChange={onChange("state")} placeholder="State" />
        <input value={form.postalCode} onChange={onChange("postalCode")} placeholder="Postal Code" />
        <select value={form.defaultTripType} onChange={onChange("defaultTripType")}>
          <option value="toAirport">To Airport</option>
          <option value="fromAirport">From Airport</option>
          <option value="pointToPoint">Point to Point</option>
        </select>
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
