"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

import api from "@/lib/api";

type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

type Invoice = {
  id: string;
  invoiceNumber: string;
  billingName: string;
  grouping: "ACCOUNT" | "BOOKER";
  periodStart: string;
  periodEnd: string;
  currency: string;
  netTotal: number;
  vatTotal: number;
  totalAmount: number;
  amountPaid: number;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus;
  outstandingAmount: number;
  issuedAt: string | null;
  dueDate: string | null;
  account: {
    id: string;
    name: string;
  };
  booker: {
    id: string;
    name: string;
  } | null;
  _count: {
    items: number;
  };
};

type InvoiceListResponse = {
  data: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type InvoiceSummary = {
  month: string | null;
  accountId: string | null;
  invoiceCount: number;
  totals: {
    totalInvoiced: number;
    paid: number;
    outstanding: number;
    overdue: number;
    draft: number;
  };
  counts: Record<string, number>;
};

function getLondonMonth() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

function money(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(value || 0);
}

function date(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message || fallback;
}

const statusClasses: Record<InvoiceStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  ISSUED: "border-blue-200 bg-blue-50 text-blue-700",
  PARTIALLY_PAID: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
  VOID: "border-slate-200 bg-slate-100 text-slate-500",
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        statusClasses[status]
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-400">{note}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [month, setMonth] = useState(getLondonMonth);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFinance = useCallback(
    async (refresh = false) => {
      try {
        refresh ? setRefreshing(true) : setLoading(true);
        setError("");

        const [summaryResponse, invoiceResponse] = await Promise.all([
          api.get<InvoiceSummary>("/finance/invoices/summary", {
            params: { month },
          }),
          api.get<InvoiceListResponse>("/finance/invoices", {
            params: { month, limit: 100 },
          }),
        ]);

        setSummary(summaryResponse.data);
        setInvoices(invoiceResponse.data.data);
      } catch (err) {
        console.error("Unable to load finance:", err);
        setError(errorMessage(err, "Unable to load finance information."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month],
  );

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return invoices;

    return invoices.filter((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.billingName,
        invoice.account?.name,
        invoice.booker?.name,
        invoice.displayStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [invoices, search]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Accounts & Billing
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Finance
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review monthly client invoices, outstanding balances and payment
            status.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
          />

          <button
            type="button"
            onClick={() => loadFinance(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            href="/dashboard/finance/generate"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <FilePlus2 size={17} />
            Generate Invoice
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Invoiced"
          value={money(summary?.totals.totalInvoiced ?? 0)}
          note="Issued invoices for this month"
          icon={<FileText size={20} />}
        />
        <StatCard
          label="Paid"
          value={money(summary?.totals.paid ?? 0)}
          note="Payments recorded"
          icon={<CircleDollarSign size={20} />}
        />
        <StatCard
          label="Outstanding"
          value={money(summary?.totals.outstanding ?? 0)}
          note="Still due from clients"
          icon={<WalletCards size={20} />}
        />
        <StatCard
          label="Overdue"
          value={money(summary?.totals.overdue ?? 0)}
          note="Past due balance"
          icon={<AlertTriangle size={20} />}
        />
        <StatCard
          label="Draft"
          value={money(summary?.totals.draft ?? 0)}
          note="Not yet issued"
          icon={<Banknote size={20} />}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Invoice Summary</h2>
            <p className="mt-1 text-xs text-slate-400">
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"} in
              the selected billing month.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice or client..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {filteredInvoices.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Client / Booker</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Jobs</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/finance/${invoice.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="mt-1 text-xs text-slate-400">
                        {invoice.grouping === "BOOKER"
                          ? "Booker invoice"
                          : "Account invoice"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        {invoice.account.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {invoice.booker?.name || "All account bookings"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {date(invoice.periodStart)} – {date(invoice.periodEnd)}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      {invoice._count.items}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={invoice.displayStatus} />
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {money(invoice.totalAmount, invoice.currency)}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700">
                      {money(invoice.outstandingAmount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <CalendarDays size={34} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold text-slate-600">
              No invoices found
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Generate the first invoice for this billing month.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
