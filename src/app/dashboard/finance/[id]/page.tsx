"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Loader2,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";

type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

type InvoiceItem = {
  id: string;
  bookingId: string | null;
  bookingReference: string;
  pickupDatetime: string;
  pickupAddress: string;
  dropoffAddress: string;
  journeyType: string | null;
  primaryBookerName: string | null;
  passengerName: string | null;
  costCenter: string | null;
  invoiceRef: string | null;
  quotedAmount: number | null;
  waitingCharge: number;
  parkingCharge: number;
  congestionCharge: number;
  discountAmount: number;
  clientSubtotal: number;
  adminFee: number;
  netAmount: number;
  vatAmount: number;
  vatPercent: number | null;
  totalAmount: number;
  paymentType: string | null;
  invoiceNote: string | null;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  accountId: string;
  bookerId: string | null;
  grouping: "ACCOUNT" | "BOOKER";
  periodStart: string;
  periodEnd: string;
  billingName: string;
  billingEmail: string | null;
  billingAddress: string | null;
  currency: string;
  netTotal: number;
  vatTotal: number;
  subtotal: number;
  adjustmentTotal: number;
  totalAmount: number;
  amountPaid: number;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus;
  outstandingAmount: number;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  account: {
    id: string;
    name: string;
    accountCode: string | null;
  };
  booker: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  items: InvoiceItem[];
};

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

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message || fallback;
}

const statusClasses: Record<InvoiceStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  ISSUED: "border-blue-200 bg-blue-50 text-blue-700",
  PARTIALLY_PAID: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
  VOID: "border-slate-200 bg-slate-100 text-slate-500",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError("Invoice ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<Invoice>(
        `/finance/invoices/${invoiceId}`,
      );

      setInvoice(response.data);
    } catch (err) {
      console.error("Unable to load invoice:", err);
      setError(errorMessage(err, "Unable to load invoice."));
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  useEffect(() => {
    if (invoice) {
      setPaymentAmount(
        invoice.outstandingAmount > 0
          ? invoice.outstandingAmount.toFixed(2)
          : "",
      );
    }
  }, [invoice]);

  const canIssue = invoice?.status === "DRAFT";
  const canReceivePayment =
    invoice &&
    ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.displayStatus) &&
    invoice.outstandingAmount > 0;
  const canVoid =
    invoice && invoice.status !== "VOID" && invoice.status !== "PAID";

  async function performAction(
    label: string,
    request: () => Promise<unknown>,
    confirmation?: string,
  ) {
    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    try {
      setWorking(label);
      setError("");
      setSuccess("");

      await request();
      await loadInvoice();

      setSuccess(
        label === "issue"
          ? "Invoice issued successfully."
          : label === "pay"
            ? "Payment recorded successfully."
            : "Invoice voided successfully.",
      );
    } catch (err) {
      console.error(`Invoice ${label} failed:`, err);
      setError(errorMessage(err, "Unable to update invoice."));
    } finally {
      setWorking("");
    }
  }

  async function recordPayment() {
    if (!invoice) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    await performAction("pay", () =>
      api.patch(`/finance/invoices/${invoice.id}/mark-paid`, {
        amount,
      }),
    );
  }

  if (loading && !invoice) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/finance"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          Back to Finance
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Invoice not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/dashboard/finance"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Finance
        </Link>
      </div>

      {error && (
        <div className="print:hidden flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="print:hidden flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="border-b border-slate-100 p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                5AB Chauffeur Services
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Invoice
              </h1>
              <p className="mt-2 font-mono text-sm font-semibold text-slate-600">
                {invoice.invoiceNumber}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${
                  statusClasses[invoice.displayStatus]
                }`}
              >
                {invoice.displayStatus.replaceAll("_", " ")}
              </span>

              <div className="print:hidden flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Printer size={16} />
                  Print / Save PDF
                </button>

                <button
                  type="button"
                  onClick={loadInvoice}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bill To
              </p>
              <p className="mt-2 font-bold text-slate-900">
                {invoice.billingName}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {invoice.billingEmail || "No invoice email"}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-500">
                {invoice.billingAddress || "No billing address"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Billing Period
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {date(invoice.periodStart)} – {date(invoice.periodEnd)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {invoice.items.length} booking
                {invoice.items.length === 1 ? "" : "s"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Issued
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {date(invoice.issuedAt)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Due: {date(invoice.dueDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Amount Due
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {money(invoice.outstandingAmount, invoice.currency)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Total: {money(invoice.totalAmount, invoice.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Date / Booking</th>
                <th className="px-5 py-3">Booker / Passenger</th>
                <th className="px-5 py-3">Journey</th>
                <th className="px-5 py-3 text-right">Net</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 align-top">
                    <p className="text-sm font-semibold text-slate-900">
                      {dateTime(item.pickupDatetime)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {item.bookingReference}
                    </p>
                    {(item.costCenter || item.invoiceRef) && (
                      <p className="mt-1 text-xs text-slate-400">
                        {item.costCenter || item.invoiceRef}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <p className="text-sm font-semibold text-slate-700">
                      {item.primaryBookerName || "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Passenger: {item.passengerName || "—"}
                    </p>
                  </td>

                  <td className="max-w-[420px] px-5 py-4 align-top">
                    <p className="text-sm text-slate-600">
                      {item.pickupAddress}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      → {item.dropoffAddress}
                    </p>
                    {item.invoiceNote && (
                      <p className="mt-2 text-xs italic text-slate-400">
                        {item.invoiceNote}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right align-top text-sm text-slate-600">
                    {money(item.netAmount, invoice.currency)}
                  </td>

                  <td className="px-5 py-4 text-right align-top text-sm text-slate-600">
                    {money(item.vatAmount, invoice.currency)}
                  </td>

                  <td className="px-5 py-4 text-right align-top text-sm font-bold text-slate-900">
                    {money(item.totalAmount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 p-6 lg:p-8">
          <div className="ml-auto max-w-md space-y-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Net</span>
              <span>{money(invoice.netTotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>VAT</span>
              <span>{money(invoice.vatTotal, invoice.currency)}</span>
            </div>
            {invoice.adjustmentTotal !== 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Adjustment</span>
                <span>{money(invoice.adjustmentTotal, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
              <span>Invoice Total</span>
              <span>{money(invoice.totalAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Paid</span>
              <span>{money(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Outstanding</span>
              <span>{money(invoice.outstandingAmount, invoice.currency)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="print:hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Invoice Actions</h2>
        <p className="mt-1 text-xs text-slate-400">
          Drafts can be issued, issued invoices can receive payments, and
          non-paid invoices can be voided.
        </p>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end">
          {canIssue && (
            <button
              type="button"
              disabled={Boolean(working)}
              onClick={() =>
                performAction(
                  "issue",
                  () => api.patch(`/finance/invoices/${invoice.id}/issue`),
                  "Issue this invoice? Its due date will be calculated from the client billing settings.",
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {working === "issue" ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <FileCheck2 size={17} />
              )}
              Issue Invoice
            </button>
          )}

          {canReceivePayment && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Payment Received
                </label>
                <div className="relative w-full sm:w-48">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    £
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={invoice.outstandingAmount}
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-4 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(working)}
                onClick={recordPayment}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {working === "pay" ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CircleDollarSign size={17} />
                )}
                Record Payment
              </button>
            </div>
          )}

          {canVoid && (
            <button
              type="button"
              disabled={Boolean(working)}
              onClick={() =>
                performAction(
                  "void",
                  () => api.patch(`/finance/invoices/${invoice.id}/void`),
                  "Void this invoice? The historical invoice will remain, but its bookings will be released so a corrected invoice can be generated.",
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 xl:ml-auto"
            >
              {working === "void" ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <XCircle size={17} />
              )}
              Void Invoice
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
