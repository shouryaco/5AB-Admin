"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Building2,
  Eye,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
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
  createdAt?: string;
  updatedAt?: string;
};

export default function ClientsPage() {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL",
  );

  const loadAccounts = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get<ClientAccount[]>("/clients/accounts");
      setAccounts(response.data);
    } catch (err) {
      console.error("Unable to load client accounts:", err);
      setError("Unable to load client accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const statusMatches =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && account.isActive) ||
        (statusFilter === "INACTIVE" && !account.isActive);

      if (!statusMatches) return false;
      if (!query) return true;

      return [
        account.name,
        account.accountCode,
        account.email,
        account.phone,
        account.billingAddress,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [accounts, search, statusFilter]);

  const activeCount = accounts.filter((account) => account.isActive).length;
  const inactiveCount = accounts.length - activeCount;

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Clients
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage client accounts, bookers and passengers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadAccounts(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/dashboard/clients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={16} />
            New Client
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Accounts"
          value={accounts.length}
          icon={<Building2 size={20} />}
        />
        <SummaryCard
          label="Active"
          value={activeCount}
          icon={<Users size={20} />}
        />
        <SummaryCard
          label="Inactive"
          value={inactiveCount}
          icon={<Users size={20} />}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search account, code, email, phone or address..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "ALL" | "ACTIVE" | "INACTIVE",
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">All accounts</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Account
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contact
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Billing Address
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{account.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {account.accountCode || "No account code"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={13} className="text-slate-400" />
                        {account.email || "—"}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone size={13} className="text-slate-400" />
                        {account.phone || "—"}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="max-w-[320px] text-sm leading-6 text-slate-600">
                      {account.billingAddress || "—"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        account.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/clients/${account.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      <Eye size={15} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Building2 size={36} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 font-semibold text-slate-700">
                      No clients found
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Try changing your search or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}
