"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import api from "@/lib/api";

export default function NewClientPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    accountCode: "",
    email: "",
    phone: "",
    billingAddress: "",
    notes: "",
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    key: keyof typeof form,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function createClient() {
    setError("");

    if (!form.name.trim()) {
      setError("Client account name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.post("/clients/accounts", {
        name: form.name.trim(),
        accountCode: form.accountCode.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        billingAddress: form.billingAddress.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      });

      router.push(`/dashboard/clients/${response.data.id}`);
    } catch (err: any) {
      console.error("Unable to create client:", err);

      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to create client account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/clients")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Clients
        </button>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            New Client
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new client account for bookings, bookers and passengers.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Building2 size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Account Details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Core client and billing information.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field label="Account Name" required>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="client-input"
              placeholder="e.g. Acme Executive Travel"
            />
          </Field>

          <Field label="Account Code">
            <input
              value={form.accountCode}
              onChange={(event) => updateField("accountCode", event.target.value)}
              className="client-input"
              placeholder="e.g. ACME001"
            />
          </Field>

          <Field label="Email">
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="client-input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="accounts@example.com"
              />
            </div>
          </Field>

          <Field label="Phone">
            <div className="relative">
              <Phone
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="client-input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="+44..."
              />
            </div>
          </Field>

          <Field label="Billing Address" span>
            <div className="relative">
              <MapPin
                size={16}
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <textarea
                value={form.billingAddress}
                onChange={(event) =>
                  updateField("billingAddress", event.target.value)
                }
                className="client-input min-h-28 resize-y"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="Billing address..."
              />
            </div>
          </Field>

          <Field label="Internal Notes" span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="client-input min-h-28 resize-y"
              placeholder="Optional internal account notes..."
            />
          </Field>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField("isActive", event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Account is active
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Active accounts can be selected when creating or editing bookings.
            </p>
          </div>
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/dashboard/clients")}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={createClient}
          disabled={saving}
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check size={17} />
              Create Client
            </>
          )}
        </button>
      </div>

      <style jsx global>{`
        .client-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: #fff;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 0.15s ease;
        }

        .client-input:focus {
          border-color: rgb(148 163 184);
        }

        .client-input::placeholder {
          color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required = false,
  span = false,
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={span ? "lg:col-span-2" : ""}>
      <label className="mb-2 block text-xs font-semibold text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
