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

type BookingSnapshotLink = {
  id: string;
  status:
    | "PENDING"
    | "ASSIGNED"
    | "ACCEPTED"
    | "ARRIVED"
    | "STARTED"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED";
  pickupDatetime: string;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  finance: {
    paymentType: string | null;
  } | null;
};

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

  booking: BookingSnapshotLink | null;
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

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value ?? 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function calculateWaitingMinutes(item: StatementItem) {
  if (!item.booking?.startedAt) {
    return 0;
  }

  const pickup = new Date(item.pickupDatetime).getTime();
  const pob = new Date(item.booking.startedAt).getTime();

  if (!Number.isFinite(pickup) || !Number.isFinite(pob)) {
    return 0;
  }

  return Math.max(0, Math.round((pob - pickup) / 60000));
}

function isCashJob(item: StatementItem) {
  return (
    item.booking?.finance?.paymentType?.trim().toUpperCase() === "CASH"
  );
}

function isCancelledJob(item: StatementItem) {
  return (
    item.booking?.status === "CANCELLED" ||
    Boolean(item.booking?.cancelledAt)
  );
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

export default function DriverPaymentSummaryPage() {
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
        console.error("Unable to load driver payment summary:", err);

        setError(
          getApiMessage(
            err,
            "Unable to load driver payment summary.",
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
            Loading payment summary...
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
            Payment summary unavailable
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>

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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
            {statement.driver.name}
            <span className="mx-2">/</span>
            Driver Statement Summary
            <span className="mx-2">/</span>
            Payment Summary
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              Payment Summary
            </h1>

            <StatusBadge status={statement.status} />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {statement.statementNumber} · {statement.items.length} job
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Journey & Pricing Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Payment breakdown for jobs included in this driver statement.
              </p>
            </div>

            <p className="text-xs font-medium text-slate-500">
              Statement Date: {formatDate(statement.statementDate)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-white">
                <th
                  colSpan={5}
                  className="border-r border-slate-700 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
                >
                  Journey Details
                </th>

                <th
                  colSpan={7}
                  className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
                >
                  Pricing Details
                </th>
              </tr>

              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <TableHead>Details</TableHead>
                <TableHead>Time Management</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Dropoff</TableHead>
                <TableHead align="center">WT (Mins)</TableHead>

                <TableHead align="right">WT £</TableHead>
                <TableHead align="right">Parking</TableHead>
                <TableHead align="right">Congestion</TableHead>
                <TableHead align="right">Price</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead align="center">Cash?</TableHead>
                <TableHead align="center">Cancel?</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {statement.items.map((item) => {
                const waitingMinutes = calculateWaitingMinutes(item);

                return (
                  <tr
                    key={item.id}
                    className="align-top transition hover:bg-slate-50/70"
                  >
                    <td className="min-w-[150px] px-4 py-4">
                      <p className="text-[11px] font-medium text-slate-500">
                        Job No:
                        {" "}
                        {item.bookingId ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/bookings/${item.bookingId}`,
                              )
                            }
                            className="font-bold text-blue-600 hover:underline"
                          >
                            {item.bookingReference}
                          </button>
                        ) : (
                          <span className="font-bold text-slate-800">
                            {item.bookingReference}
                          </span>
                        )}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-500">
                        Job Type:{" "}
                        <span className="font-semibold text-slate-700">
                          {item.journeyType || "—"}
                        </span>
                      </p>

                      <p className="mt-2 text-[11px] text-slate-400">
                        {item.customerName}
                      </p>
                    </td>

                    <td className="min-w-[210px] px-4 py-4 text-[11px] leading-5 text-slate-600">
                      <TimeLine
                        label="Pick Up"
                        value={formatDateTime(item.pickupDatetime)}
                      />

                      <TimeLine
                        label="POB Time"
                        value={formatDateTime(item.booking?.startedAt)}
                      />

                      <TimeLine
                        label="Clear Time"
                        value={formatDateTime(item.booking?.completedAt)}
                      />
                    </td>

                    <td className="min-w-[240px] px-4 py-4">
                      <AddressCell value={item.pickupAddress} />
                    </td>

                    <td className="min-w-[240px] px-4 py-4">
                      <AddressCell value={item.dropoffAddress} />
                    </td>

                    <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">
                      {waitingMinutes}
                    </td>

                    <MoneyCell value={item.driverWaitingPay} />
                    <MoneyCell value={item.driverParking} />
                    <MoneyCell value={item.driverCongestion} />
                    <MoneyCell value={item.driverCost} />
                    <MoneyCell value={item.netAmount} strong />

                    <YesNoCell value={isCashJob(item)} />
                    <YesNoCell value={isCancelledJob(item)} />
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-4 text-right text-sm font-bold text-slate-700"
                >
                  Statement Net
                </td>

                <td className="px-4 py-4 text-right text-sm font-semibold text-slate-500">
                  —
                </td>

                <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                  {formatMoney(statement.netTotal)}
                </td>

                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

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
              value={formatDateTime(statement.paidAt)}
            />

            <Detail
              label="Currency"
              value={statement.currency}
            />
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

            <Detail
              label="Phone"
              value={statement.driver.phone || "—"}
            />

            <Detail
              label="Email"
              value={statement.driver.email || "—"}
            />

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

      {statement.vatRegistered && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          Net {formatMoney(statement.netTotal)} + VAT{" "}
          {formatMoney(statement.vatTotal)} = Gross{" "}
          <span className="font-bold text-slate-900">
            {formatMoney(statement.grossTotal)}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: StatementStatus;
}) {
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

        <div className="text-slate-400">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function TimeLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="font-semibold text-slate-500">
        {label}:
      </span>{" "}
      <span className="text-slate-700">
        {value}
      </span>
    </div>
  );
}

function AddressCell({
  value,
}: {
  value: string;
}) {
  return (
    <div className="flex gap-2 text-[11px] leading-5 text-slate-600">
      <MapPin
        size={13}
        className="mt-0.5 shrink-0 text-slate-400"
      />

      <span>
        {value || "—"}
      </span>
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
      className={`whitespace-nowrap border-r border-slate-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wide last:border-r-0 ${alignClass}`}
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
      className={`whitespace-nowrap px-4 py-4 text-right text-sm ${
        strong
          ? "font-bold text-slate-900"
          : "font-semibold text-slate-600"
      }`}
    >
      {formatMoney(value)}
    </td>
  );
}

function YesNoCell({
  value,
}: {
  value: boolean;
}) {
  return (
    <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">
      {value ? "Y" : "N"}
    </td>
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

        <h2 className="font-semibold text-slate-900">
          {title}
        </h2>
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

function DetailsGrid({
  children,
}: {
  children: ReactNode;
}) {
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
