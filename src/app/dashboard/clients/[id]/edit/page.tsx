"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
} from "lucide-react";

import api from "@/lib/api";

type ClientAccount = {
  id: string;
  name: string;
  accountCode: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  notes: string | null;
  isActive: boolean;
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [form, setForm] = useState({
    name: "",
    accountCode: "",
    email: "",
    phone: "",
    billingAddress: "",
    notes: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadClient = useCallback(
    async (refresh = false) => {
      if (!clientId) {
        setError("Client ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get<ClientAccount>(
          `/clients/accounts/${clientId}`,
        );

        const account = response.data;

        setForm({
          name: account.name || "",
          accountCode: account.accountCode || "",
          email: account.email || "",
          phone: account.phone || "",
          billingAddress: account.billingAddress || "",
          notes: account.notes || "",
          isActive: account.isActive,
        });
      } catch (err: any) {
        console.error("Unable to load client:", err);

        const message = err?.response?.data?.message;

        setError(
          Array.isArray(message)
            ? message.join(", ")
            : message || "Unable to load client account.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  function updateField(
    key: keyof typeof form,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveClient() {
    if (!clientId) return;

    setError("");

    if (!form.name.trim()) {
      setError("Client account name is required.");
      return;
    }

    try {
      setSaving(true);

      await api.patch(`/clients/accounts/${clientId}`, {
        name: form.name.trim(),
        accountCode: form.accountCode.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        billingAddress: form.billingAddress.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      });

      router.push(`/dashboard/clients/${clientId}`);
    } catch (err: any) {
      console.error("Unable to update client:", err);

      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to update client account.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">
            Loading client account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Client
          </button>

          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              Edit Client
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Update account details and availability.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadClient(true)}
          disabled={refreshing || saving}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Reload
        </button>
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
            />
          </Field>

          <Field label="Account Code">
            <input
              value={form.accountCode}
              onChange={(event) => updateField("accountCode", event.target.value)}
              className="client-input"
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
              />
            </div>
          </Field>

          <Field label="Internal Notes" span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="client-input min-h-28 resize-y"
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
              Inactive accounts stay in the system but cannot be selected for
              new booking allocation.
            </p>
          </div>
        </label>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={saveClient}
          disabled={saving}
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={17} />
              Save Changes
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
