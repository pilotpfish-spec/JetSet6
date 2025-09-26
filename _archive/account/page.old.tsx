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

  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    defaultTripType: "toAirport" | "fromAirport" | "pointToPoint";
  }>({
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
      } catch (e: any) {
        if (!cancelled) setError("We couldn’t load your profile. You can still try saving updates below.");
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Account</h1>
        <p>You’re not signed in.</p>
        <button
          onClick={() => signIn("google")}
          style={{ marginTop: 12, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6 }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const onChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

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

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `PUT /api/user ${res.status}`);
      }

      setSaved(true);
      // Refresh any server components that depend on the session/user.
      router.refresh();
    } catch (e: any) {
      setError(
        "We couldn’t save your profile. If this keeps happening, the /api/user endpoint may need PUT support for these fields."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Account</h1>
        <Link href="/account/bookings" style={{ textDecoration: "underline" }}>
          Your bookings →
        </Link>
      </div>

      {loading && <div style={{ marginTop: 12, color: "#6b7280" }}>Loading profile…</div>}
      {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}
      {saved && <div style={{ marginTop: 12, color: "#065f46" }}>Saved!</div>}

      <form onSubmit={onSave} style={{ marginTop: 16 }}>
        <Field label="Name">
          <input value={form.name} readOnly aria-readonly style={inputStyle} />
        </Field>
        <Field label="Email">
          <input value={form.email} readOnly aria-readonly style={inputStyle} />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={onChange("phone")} placeholder="(555) 555‑5555" style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Address line 1">
            <input value={form.addressLine1} onChange={onChange("addressLine1")} style={inputStyle} />
          </Field>
          <Field label="Address line 2">
            <input value={form.addressLine2} onChange={onChange("addressLine2")} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <Field label="City">
            <input value={form.city} onChange={onChange("city")} style={inputStyle} />
          </Field>
          <Field label="State">
            <input value={form.state} onChange={onChange("state")} style={inputStyle} />
          </Field>
          <Field label="Postal code">
            <input value={form.postalCode} onChange={onChange("postalCode")} style={inputStyle} />
          </Field>
        </div>

        <Field label="Default trip type">
          <select value={form.defaultTripType} onChange={onChange("defaultTripType")} style={inputStyle}>
            <option value="toAirport">To Airport</option>
            <option value="fromAirport">From Airport</option>
            <option value="pointToPoint">Point to Point</option>
          </select>
        </Field>

        <div style={{ marginTop: 16 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{props.label}</div>
      {props.children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "8px 10px",
};

