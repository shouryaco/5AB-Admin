"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";

type DriverSummary = {
  id: string;
  name: string;
  callSign: string | null;
};

type StatementStatus = "ISSUED" | "PAID" | "VOID";

type DriverStatement = {
  id: string;
  statementNumber: string;
  periodStart: string;
  periodEnd: string;
  statementDate: string;
  dueDate: string;
  currency: string;
  vatRegistered: boolean;
  vatPercent: number;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  status: StatementStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    items: number;
  };
};

type PreviewResponse = {
  bookingCount: number;
  totals: {
    netTotal: number;
    vatTotal: number;
    grossTotal: number;
  };
};

function getLondonMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";

  return `${year}-${month}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonth(value: string) {
  if (!value) return "";

  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function escapeCsv(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function getApiMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return typeof message === "string" && message.trim()
    ? message
    : fallback;
}

export default function DriverStatementSummaryPage() {
  const params = useParams();
  const router = useRouter();

  const driverId = String(params.id || "");

  const [driver, setDriver] = useState<DriverSummary | null>(null);
  const [statements, setStatements] = useState<DriverStatement[]>([]);

  const [month, setMonth] = useState(getLondonMonthKey());
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paidUpdatingId, setPaidUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(
    async (refresh = false) => {
      if (!driverId) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [driverResponse, statementsResponse] = await Promise.all([
          api.get<DriverSummary>(`/drivers/${driverId}`),
          api.get<DriverStatement[]>(`/drivers/${driverId}/statements`, {
            params: month ? { month } : undefined,
          }),
        ]);

        setDriver(driverResponse.data);
        setStatements(statementsResponse.data);
      } catch (err: any) {
        console.error("Unable to load driver statements:", err);
        setError(
          getApiMessage(
            err,
            "Unable to load driver statement summary.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [driverId, month],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredStatements = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return statements;

    return statements.filter((statement) =>
      statement.statementNumber.toLowerCase().includes(query),
    );
  }, [search, statements]);

  const totals = useMemo(() => {
    return filteredStatements.reduce(
      (current, statement) => ({
        net: current.net + statement.netTotal,
        vat: current.vat + statement.vatTotal,
        gross: current.gross + statement.grossTotal,
      }),
      {
        net: 0,
        vat: 0,
        gross: 0,
      },
    );
  }, [filteredStatements]);

  async function generateStatement() {
    if (!driverId || !month) return;

    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      const previewResponse = await api.get<PreviewResponse>(
        `/drivers/${driverId}/statements/preview`,
        {
          params: {
            month,
          },
        },
      );

      const preview = previewResponse.data;

      if (preview.bookingCount === 0) {
        setError(
          `No eligible completed jobs are available for ${formatMonth(month)}.`,
        );
        return;
      }

      const confirmed = window.confirm(
        `Generate a driver statement for ${formatMonth(month)}?\n\n` +
          `Jobs: ${preview.bookingCount}\n` +
          `Net: ${formatMoney(preview.totals.netTotal)}\n` +
          `VAT: ${formatMoney(preview.totals.vatTotal)}\n` +
          `Gross: ${formatMoney(preview.totals.grossTotal)}`,
      );

      if (!confirmed) return;

      const response = await api.post(
        `/drivers/${driverId}/statements`,
        {
          month,
        },
      );

      setSuccess(
        response.data?.message ||
          "Driver statement generated successfully.",
      );

      await loadData(true);
    } catch (err: any) {
      console.error("Unable to generate driver statement:", err);
      setError(
        getApiMessage(
          err,
          "Unable to generate driver statement.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }

  async function togglePaid(statement: DriverStatement) {
    if (statement.status === "VOID") return;

    const nextPaid = statement.status !== "PAID";

    const confirmed = window.confirm(
      nextPaid
        ? `Mark ${statement.statementNumber} as paid?`
        : `Mark ${statement.statementNumber} as unpaid?`,
    );

    if (!confirmed) return;

    try {
      setPaidUpdatingId(statement.id);
      setError("");
      setSuccess("");

      if (nextPaid) {
        await api.patch(
          `/drivers/${driverId}/statements/${statement.id}/paid`,
          {},
        );
      } else {
        await api.patch(
          `/drivers/${driverId}/statements/${statement.id}/unpaid`,
          {},
        );
      }

      setSuccess(
        nextPaid
          ? `${statement.statementNumber} marked as paid.`
          : `${statement.statementNumber} marked as unpaid.`,
      );

      await loadData(true);
    } catch (err: any) {
      console.error("Unable to update statement payment status:", err);
      setError(
        getApiMessage(
          err,
          "Unable to update statement payment status.",
        ),
      );
    } finally {
      setPaidUpdatingId(null);
    }
  }

  function exportCsv() {
    if (!filteredStatements.length) return;

    const headers = [
      "Statement Name",
      "Statement Date",
      "Due Date",
      "Net",
      "VAT",
      "Gross",
      "Paid",
      "Paid Date",
      "Jobs",
      "Status",
    ];

    const rows = filteredStatements.map((statement) => [
      statement.statementNumber,
      formatDate(statement.statementDate),
      formatDate(statement.dueDate),
      statement.netTotal.toFixed(2),
      statement.vatTotal.toFixed(2),
      statement.grossTotal.toFixed(2),
      statement.status === "PAID" ? "Yes" : "No",
      statement.paidAt ? formatDate(statement.paidAt) : "",
      statement._count.items,
      statement.status,
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `5ab-driver-statements-${driver?.name || "driver"}-${month}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">
            Loading driver statements...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/drivers/${driverId}`)}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Driver Profile
          </button>

          <div className="text-sm text-slate-400">
            Drivers
            <span className="mx-2">/</span>
            <span className="text-slate-600">
              {driver?.name || "Driver"}
            </span>
            <span className="mx-2">/</span>
            Statement Summary
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              Driver Statement Summary
            </h1>

            {driver?.callSign && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {driver.callSign}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {driver?.name} · {formatMonth(month)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={generateStatement}
            disabled={generating || !month}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {generating ? "Generating..." : "Generate Statement"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_240px_auto]">
          <label className="relative block">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search statement name..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <label className="relative block">
            <CalendarDays
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <button
            type="button"
            onClick={exportCsv}
            disabled={!filteredStatements.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Net" value={formatMoney(totals.net)} />
        <SummaryCard label="VAT" value={formatMoney(totals.vat)} />
        <SummaryCard label="Gross" value={formatMoney(totals.gross)} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>Statement Name</TableHead>
                <TableHead>Statement Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead align="right">Net</TableHead>
                <TableHead align="right">VAT</TableHead>
                <TableHead align="right">Gross</TableHead>
                <TableHead align="center">View</TableHead>
                <TableHead align="center">Paid?</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredStatements.map((statement) => (
                <tr
                  key={statement.id}
                  className="transition hover:bg-slate-50/70"
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/drivers/${driverId}/statements/${statement.id}`,
                        )
                      }
                      className="font-semibold text-slate-900 transition hover:text-slate-600"
                    >
                      {statement.statementNumber}
                    </button>

                    <p className="mt-1 text-xs text-slate-400">
                      {statement._count.items} job
                      {statement._count.items === 1 ? "" : "s"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {formatDate(statement.statementDate)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {formatDate(statement.dueDate)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                    {formatMoney(statement.netTotal)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                    {formatMoney(statement.vatTotal)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                    {formatMoney(statement.grossTotal)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/drivers/${driverId}/statements/${statement.id}`,
                        )
                      }
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      title="View statement"
                    >
                      <Eye size={17} />
                    </button>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-center">
                    {statement.status === "VOID" ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Void
                      </span>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={statement.status === "PAID"}
                          disabled={paidUpdatingId === statement.id}
                          onChange={() => void togglePaid(statement)}
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:opacity-50"
                        />
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredStatements.length && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileText size={22} />
            </div>

            <p className="mt-4 font-semibold text-slate-700">
              No statements found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Generate a statement for {formatMonth(month)} or choose another
              month.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <th
      className={`whitespace-nowrap px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500 ${alignClass}`}
    >
      {children}
    </th>
  );
}
