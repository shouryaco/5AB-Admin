"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  MapPin,
  ReceiptText,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";

type StatementStatus = "ISSUED" | "PAID" | "VOID";

type StatementItem = {
  id: string;
  bookingId: string | null;
  bookingReference: string;
  pickupDatetime: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  journeyType: string | null;
  driverCost: number;
  driverWaitingPay: number;
  driverParking: number;
  driverCongestion: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
};

type DriverStatementDetail = {
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
  driver: {
    id: string;
    name: string;
    callSign: string | null;
    phone: string;
    email: string | null;
    bankName: string | null;
    accountHolderName: string | null;
    accountNumber: string | null;
    sortCode: string | null;
  };
  items: StatementItem[];
};

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

export default function DriverStatementDetailPage() {
  const params = useParams();
  const router = useRouter();

  const driverId = String(params.id || "");
  const statementId = String(params.statementId || "");

  const [statement, setStatement] =
    useState<DriverStatementDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPaid, setUpdatingPaid] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatement = useCallback(
    async (refresh = false) => {
      if (!driverId || !statementId) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get<DriverStatementDetail>(
          `/drivers/${driverId}/statements/${statementId}`,
        );

        setStatement(response.data);
      } catch (err: any) {
        console.error("Unable to load driver statement:", err);
        setError(
          getApiMessage(
            err,
            "Unable to load driver statement.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [driverId, statementId],
  );

  useEffect(() => {
    void loadStatement();
  }, [loadStatement]);

  async function togglePaid() {
    if (!statement || statement.status === "VOID") return;

    const nextPaid = statement.status !== "PAID";

    const confirmed = window.confirm(
      nextPaid
        ? `Mark ${statement.statementNumber} as paid?`
        : `Mark ${statement.statementNumber} as unpaid?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingPaid(true);
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
          ? "Statement marked as paid."
          : "Statement marked as unpaid.",
      );

      await loadStatement(true);
    } catch (err: any) {
      console.error("Unable to update statement:", err);
      setError(
        getApiMessage(
          err,
          "Unable to update statement payment status.",
        ),
      );
    } finally {
      setUpdatingPaid(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">
            Loading statement...
          </p>
        </div>
      </div>
    );
  }

  if (error && !statement) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Statement unavailable
          </p>
          <p className="mt-1 text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/drivers/${driverId}/statements`)
            }
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to Statements
          </button>
        </div>
      </div>
    );
  }

  if (!statement) return null;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/drivers/${driverId}/statements`)
            }
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Statement Summary
          </button>

          <div className="text-sm text-slate-400">
            Drivers
            <span className="mx-2">/</span>
            <span className="text-slate-600">
              {statement.driver.name}
            </span>
            <span className="mx-2">/</span>
            Statements
            <span className="mx-2">/</span>
            {statement.statementNumber}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              {statement.statementNumber}
            </h1>

            <StatusBadge status={statement.status} />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {statement.driver.name} · {statement.items.length} job
            {statement.items.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadStatement(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {statement.status !== "VOID" && (
            <button
              type="button"
              onClick={togglePaid}
              disabled={updatingPaid}
              className={
                statement.status === "PAID"
                  ? "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  : "inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              }
            >
              {updatingPaid ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {statement.status === "PAID"
                ? "Mark Unpaid"
                : "Mark Paid"}
            </button>
          )}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TotalCard
          label="Net"
          value={formatMoney(statement.netTotal)}
          icon={<Banknote size={19} />}
        />
        <TotalCard
          label="VAT"
          value={formatMoney(statement.vatTotal)}
          icon={<ReceiptText size={19} />}
        />
        <TotalCard
          label="Gross"
          value={formatMoney(statement.grossTotal)}
          icon={<CircleDollarSign size={19} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InfoSection
          title="Statement Details"
          icon={<CalendarDays size={18} />}
        >
          <DetailsGrid>
            <Detail
              label="Statement Date"
              value={formatDate(statement.statementDate)}
            />
            <Detail
              label="Due Date"
              value={formatDate(statement.dueDate)}
            />
            <Detail
              label="Period Start"
              value={formatDate(statement.periodStart)}
            />
            <Detail
              label="Period End"
              value={formatDate(statement.periodEnd)}
            />
            <Detail
              label="VAT Registered"
              value={statement.vatRegistered ? "Yes" : "No"}
            />
            <Detail
              label="VAT Rate"
              value={
                statement.vatRegistered
                  ? `${statement.vatPercent}%`
                  : "0%"
              }
            />
            <Detail
              label="Paid Date"
              value={
                statement.paidAt
                  ? formatDateTime(statement.paidAt)
                  : "—"
              }
            />
            <Detail label="Currency" value={statement.currency} />
          </DetailsGrid>
        </InfoSection>

        <InfoSection
          title="Driver & Payment Details"
          icon={<UserRound size={18} />}
        >
          <DetailsGrid>
            <Detail label="Driver" value={statement.driver.name} />
            <Detail
              label="Call Sign"
              value={statement.driver.callSign || "—"}
            />
            <Detail label="Phone" value={statement.driver.phone || "—"} />
            <Detail label="Email" value={statement.driver.email || "—"} />
            <Detail
              label="Bank"
              value={statement.driver.bankName || "—"}
            />
            <Detail
              label="Account Holder"
              value={statement.driver.accountHolderName || "—"}
            />
            <Detail
              label="Account Number"
              value={statement.driver.accountNumber || "—"}
            />
            <Detail
              label="Sort Code"
              value={statement.driver.sortCode || "—"}
            />
          </DetailsGrid>
        </InfoSection>
      </div>

      {statement.notes && (
        <InfoSection
          title="Statement Notes"
          icon={<FileText size={18} />}
        >
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {statement.notes}
          </p>
        </InfoSection>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
              <ReceiptText size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Statement Jobs
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Historical driver payout snapshot for this statement.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full">
            <thead className="border-b border-slate-200 bg-white">
              <tr>
                <TableHead>Job</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Journey</TableHead>
                <TableHead align="right">Base</TableHead>
                <TableHead align="right">Waiting</TableHead>
                <TableHead align="right">Parking</TableHead>
                <TableHead align="right">Congestion</TableHead>
                <TableHead align="right">Net</TableHead>
                <TableHead align="right">VAT</TableHead>
                <TableHead align="right">Gross</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {statement.items.map((item) => (
                <tr
                  key={item.id}
                  className="align-top transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    {item.bookingId ? (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/bookings/${item.bookingId}`,
                          )
                        }
                        className="font-semibold text-slate-900 hover:text-slate-600"
                      >
                        {item.bookingReference}
                      </button>
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.bookingReference}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-400">
                      {item.customerName}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {formatDateTime(item.pickupDatetime)}
                  </td>

                  <td className="max-w-[360px] px-5 py-4">
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex gap-2">
                        <MapPin
                          size={14}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <span>{item.pickupAddress}</span>
                      </div>
                      <div className="flex gap-2">
                        <MapPin
                          size={14}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <span>{item.dropoffAddress}</span>
                      </div>
                    </div>
                  </td>

                  <MoneyCell value={item.driverCost} />
                  <MoneyCell value={item.driverWaitingPay} />
                  <MoneyCell value={item.driverParking} />
                  <MoneyCell value={item.driverCongestion} />
                  <MoneyCell value={item.netAmount} strong />
                  <MoneyCell value={item.vatAmount} />
                  <MoneyCell value={item.grossAmount} strong />
                </tr>
              ))}
            </tbody>

            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-4 text-right text-sm font-bold text-slate-700"
                >
                  Statement Total
                </td>
                <MoneyCell value={statement.netTotal} strong />
                <MoneyCell value={statement.vatTotal} strong />
                <MoneyCell value={statement.grossTotal} strong />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: StatementStatus }) {
  const className =
    status === "PAID"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "VOID"
        ? "border-slate-200 bg-slate-100 text-slate-500"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {status}
    </span>
  );
}

function TotalCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="text-slate-400">{icon}</div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InfoSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
          {icon}
        </div>

        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function DetailsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-medium text-slate-700">
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
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function MoneyCell({
  value,
  strong = false,
}: {
  value: number;
  strong?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-5 py-4 text-right text-sm ${
        strong
          ? "font-bold text-slate-900"
          : "font-semibold text-slate-600"
      }`}
    >
      {formatMoney(value)}
    </td>
  );
}
