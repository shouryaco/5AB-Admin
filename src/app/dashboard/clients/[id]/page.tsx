"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  Edit3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
  X,
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

type Booker = {
  id: string;
  accountId: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type Passenger = {
  id: string;
  accountId: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type PersonType = "BOOKER" | "PASSENGER";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [bookers, setBookers] = useState<Booker[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [personModal, setPersonModal] = useState<{
    type: PersonType;
    item: Booker | Passenger | null;
  } | null>(null);

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

        const [accountResponse, bookerResponse, passengerResponse] =
          await Promise.all([
            api.get<ClientAccount>(`/clients/accounts/${clientId}`),
            api.get<Booker[]>(`/clients/bookers?accountId=${clientId}`),
            api.get<Passenger[]>(`/clients/passengers?accountId=${clientId}`),
          ]);

        setAccount(accountResponse.data);
        setBookers(bookerResponse.data);
        setPassengers(passengerResponse.data);
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

  const filteredBookers = useMemo(
    () => filterPeople(bookers, search),
    [bookers, search],
  );

  const filteredPassengers = useMemo(
    () => filterPeople(passengers, search),
    [passengers, search],
  );

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

  if (!account) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Client account could not be loaded.
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
            onClick={() => router.push("/dashboard/clients")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Clients
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                {account.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {account.accountCode || "No account code"}
              </p>
            </div>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                account.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {account.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadClient(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <Link
            href={`/dashboard/clients/${account.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Edit3 size={16} />
            Edit Client
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Building2 size={17} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Account Details
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DetailCard
            icon={<Mail size={15} />}
            label="Email"
            value={account.email || "—"}
          />
          <DetailCard
            icon={<Phone size={15} />}
            label="Phone"
            value={account.phone || "—"}
          />
          <DetailCard
            icon={<MapPin size={15} />}
            label="Billing Address"
            value={account.billingAddress || "—"}
            span
          />
          <DetailCard
            label="Internal Notes"
            value={account.notes || "—"}
            span
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Account Contacts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage bookers and passengers linked to this client.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PeoplePanel
            title="Bookers"
            description="People who create or manage bookings for this account."
            icon={<UserRound size={18} />}
            items={filteredBookers}
            addLabel="Add Booker"
            onAdd={() =>
              setPersonModal({
                type: "BOOKER",
                item: null,
              })
            }
            onEdit={(item) =>
              setPersonModal({
                type: "BOOKER",
                item,
              })
            }
          />

          <PeoplePanel
            title="Passengers"
            description="Passengers available as presets when creating bookings."
            icon={<UsersRound size={18} />}
            items={filteredPassengers}
            addLabel="Add Passenger"
            onAdd={() =>
              setPersonModal({
                type: "PASSENGER",
                item: null,
              })
            }
            onEdit={(item) =>
              setPersonModal({
                type: "PASSENGER",
                item,
              })
            }
          />
        </div>
      </section>

      {personModal && (
        <PersonModal
          accountId={account.id}
          type={personModal.type}
          item={personModal.item}
          onClose={() => setPersonModal(null)}
          onSaved={async () => {
            setPersonModal(null);
            await loadClient(true);
          }}
        />
      )}
    </div>
  );
}

function PeoplePanel({
  title,
  description,
  icon,
  items,
  addLabel,
  onAdd,
  onEdit,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: Array<Booker | Passenger>;
  addLabel: string;
  onAdd: () => void;
  onEdit: (item: Booker | Passenger) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={14} />
              {addLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{item.name}</p>

                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} />
                    {item.phone || "—"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} />
                    {item.email || "—"}
                  </p>
                </div>

                {item.notes && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                    {item.notes}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Edit3 size={13} />
                Edit
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              No contacts found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonModal({
  accountId,
  type,
  item,
  onClose,
  onSaved,
}: {
  accountId: string;
  type: PersonType;
  item: Booker | Passenger | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isBooker = type === "BOOKER";
  const editing = Boolean(item);

  const [form, setForm] = useState({
    firstName: item?.firstName || "",
    lastName: item?.lastName || "",
    name: item?.name || "",
    phone: item?.phone || "",
    email: item?.email || "",
    notes: item?.notes || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function syncName(firstName: string, lastName: string) {
    const generated = `${firstName} ${lastName}`.trim();

    setForm((current) => ({
      ...current,
      firstName,
      lastName,
      name:
        !current.name.trim() ||
        current.name.trim() ===
          `${current.firstName} ${current.lastName}`.trim()
          ? generated
          : current.name,
    }));
  }

  async function save() {
    setError("");

    if (!form.name.trim()) {
      setError("Display name is required.");
      return;
    }

    const endpoint = isBooker ? "/clients/bookers" : "/clients/passengers";

    const payload = {
      accountId,
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      setSaving(true);

      if (editing && item) {
        await api.patch(`${endpoint}/${item.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      await onSaved();
    } catch (err: any) {
      console.error(`Unable to save ${type.toLowerCase()}:`, err);

      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message ||
              `Unable to ${editing ? "update" : "create"} ${
                isBooker ? "booker" : "passenger"
              }.`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? "Edit" : "Add"} {isBooker ? "Booker" : "Passenger"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This contact will be linked to the current client account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ModalField label="First Name">
              <input
                value={form.firstName}
                onChange={(event) =>
                  syncName(event.target.value, form.lastName)
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </ModalField>

            <ModalField label="Last Name">
              <input
                value={form.lastName}
                onChange={(event) =>
                  syncName(form.firstName, event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </ModalField>

            <ModalField label="Display Name" required span>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                placeholder="Name shown in booking presets"
              />
            </ModalField>

            <ModalField label="Phone">
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </ModalField>

            <ModalField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </ModalField>

            <ModalField label="Notes" span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-24 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </ModalField>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus size={16} />
                {editing ? "Save Changes" : `Add ${isBooker ? "Booker" : "Passenger"}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon,
  span = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/60 p-4 ${
        span ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function ModalField({
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
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="mb-2 block text-xs font-semibold text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function filterPeople<T extends Booker | Passenger>(
  items: T[],
  queryValue: string,
) {
  const query = queryValue.trim().toLowerCase();

  if (!query) return items;

  return items.filter((item) =>
    [item.name, item.firstName, item.lastName, item.phone, item.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );
}
