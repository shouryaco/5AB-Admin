"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FilePlus2,
  Loader2,
  RefreshCw,
  Save,
  UsersRound,
} from "lucide-react";

import api from "@/lib/api";

type InvoiceGrouping = "ACCOUNT" | "BOOKER";

type ClientAccount = {
  id: string;
  name: string;
  accountCode: string | null;
  email: string | null;
  billingAddress: string | null;
  invoiceEmail: string | null;
  invoiceGrouping: InvoiceGrouping;
  invoiceDueDays: number;
};

type Booker = {
  id: string;
  accountId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
};

type PreviewBooking = {
  bookingId: string;
  bookingReference: string;
  pickupDatetime: string;
  pickupAddress: string;
  dropoffAddress: string;
  journeyType: string | null;
  costCenter: string | null;
  invoiceRef: string | null;
  primaryBooker: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  primaryPassenger: {
    id: string;
    name: string;
  } | null;
  finance: {
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
};

type PreviewResponse = {
  month: string;
  periodStart: string;
  periodEnd: string;
  account: {
    id: string;
    name: string;
    invoiceEmail: string | null;
    billingAddress: string | null;
    invoiceGrouping: InvoiceGrouping;
    invoiceDueDays: number;
  };
  booker: Booker | null;
  bookingCount: number;
  bookings: PreviewBooking[];
  totals: {
    subtotal: number;
    netTotal: number;
    vatTotal: number;
    bookingTotal: number;
    adjustmentTotal: number;
    totalAmount: number;
  };
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

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value || 0);
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

export default function GenerateInvoicePage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [bookers, setBookers] = useState<Booker[]>([]);

  const [month, setMonth] = useState(getLondonMonth);
  const [accountId, setAccountId] = useState("");
  const [grouping, setGrouping] = useState<InvoiceGrouping>("ACCOUNT");
  const [bookerId, setBookerId] = useState("");

  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceDueDays, setInvoiceDueDays] = useState("30");

  const [adjustmentTotal, setAdjustmentTotal] = useState("0");
  const [notes, setNotes] = useState("");

  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingBookers, setLoadingBookers] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) || null,
    [accounts, accountId],
  );

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        setError("");

        const response = await api.get<ClientAccount[]>(
          "/clients/accounts?active=true",
        );

        setAccounts(response.data);
      } catch (err) {
        console.error("Unable to load accounts:", err);
        setError(errorMessage(err, "Unable to load client accounts."));
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  useEffect(() => {
    setPreview(null);
    setSuccess("");
    setBookerId("");
    setBookers([]);

    if (!selectedAccount) {
      setInvoiceEmail("");
      setInvoiceDueDays("30");
      setGrouping("ACCOUNT");
      return;
    }

    setInvoiceEmail(
      selectedAccount.invoiceEmail || selectedAccount.email || "",
    );
    setInvoiceDueDays(String(selectedAccount.invoiceDueDays ?? 30));
    setGrouping(selectedAccount.invoiceGrouping || "ACCOUNT");
  }, [selectedAccount]);

  useEffect(() => {
    if (!accountId || grouping !== "BOOKER") {
      setBookers([]);
      setBookerId("");
      return;
    }

    async function loadBookers() {
      try {
        setLoadingBookers(true);
        setError("");

        const response = await api.get<Booker[]>("/clients/bookers", {
          params: { accountId },
        });

        setBookers(response.data);
      } catch (err) {
        console.error("Unable to load bookers:", err);
        setError(errorMessage(err, "Unable to load account bookers."));
      } finally {
        setLoadingBookers(false);
      }
    }

    loadBookers();
  }, [accountId, grouping]);

  const finalPreviewTotal = useMemo(() => {
    const adjustment = Number(adjustmentTotal || 0);

    return (preview?.totals.bookingTotal ?? 0) + (Number.isFinite(adjustment) ? adjustment : 0);
  }, [adjustmentTotal, preview]);

  const loadPreview = useCallback(async () => {
    setError("");
    setSuccess("");

    if (!accountId) {
      setError("Select a client account.");
      return;
    }

    if (grouping === "BOOKER" && !bookerId) {
      setError("Select a booker for a separate booker invoice.");
      return;
    }

    try {
      setLoadingPreview(true);

      const response = await api.get<PreviewResponse>(
        "/finance/invoices/preview",
        {
          params: {
            month,
            accountId,
            ...(grouping === "BOOKER" ? { bookerId } : {}),
          },
        },
      );

      setPreview(response.data);
    } catch (err) {
      console.error("Unable to preview invoice:", err);
      setPreview(null);
      setError(errorMessage(err, "Unable to preview this invoice."));
    } finally {
      setLoadingPreview(false);
    }
  }, [accountId, bookerId, grouping, month]);

  async function saveBillingSettings() {
    setError("");
    setSuccess("");

    if (!accountId) {
      setError("Select a client account first.");
      return;
    }

    const dueDays = Number(invoiceDueDays);

    if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) {
      setError("Invoice due days must be between 0 and 365.");
      return;
    }

    try {
      setSavingSettings(true);

      await api.patch(`/finance/accounts/${accountId}/billing-settings`, {
        invoiceEmail: invoiceEmail.trim() || null,
        invoiceGrouping: grouping,
        invoiceDueDays: dueDays,
      });

      setAccounts((current) =>
        current.map((account) =>
          account.id === accountId
            ? {
                ...account,
                invoiceEmail: invoiceEmail.trim() || null,
                invoiceGrouping: grouping,
                invoiceDueDays: dueDays,
              }
            : account,
        ),
      );

      setSuccess("Billing settings saved.");
    } catch (err) {
      console.error("Unable to save billing settings:", err);
      setError(errorMessage(err, "Unable to save billing settings."));
    } finally {
      setSavingSettings(false);
    }
  }

  async function generateInvoice() {
    setError("");
    setSuccess("");

    if (!preview || preview.bookingCount === 0) {
      setError("Load a preview with at least one eligible booking first.");
      return;
    }

    const adjustment = Number(adjustmentTotal || 0);

    if (!Number.isFinite(adjustment)) {
      setError("Adjustment must be a valid amount.");
      return;
    }

    try {
      setGenerating(true);

      const response = await api.post("/finance/invoices", {
        month,
        accountId,
        grouping,
        ...(grouping === "BOOKER" ? { bookerId } : {}),
        adjustmentTotal: adjustment,
        notes: notes.trim() || undefined,
      });

      const invoiceId = response.data?.invoice?.id;

      if (!invoiceId) {
        throw new Error("Generated invoice ID was not returned");
      }

      router.push(`/dashboard/finance/${invoiceId}`);
    } catch (err) {
      console.error("Unable to generate invoice:", err);
      setError(errorMessage(err, "Unable to generate invoice."));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/finance"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Finance
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Monthly Billing
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Generate Invoice
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Choose a billing month and client. The system will collect completed,
          uninvoiced account bookings and calculate the amount to charge.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="font-bold text-slate-900">Invoice Selection</h2>
          <p className="mt-1 text-xs text-slate-400">
            Account invoices combine all eligible jobs. Booker invoices include
            jobs where that person is the primary booker.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Billing Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setPreview(null);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Client Account
            </label>
            <select
              value={accountId}
              disabled={loadingAccounts}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
            >
              <option value="">
                {loadingAccounts ? "Loading accounts..." : "Select account..."}
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.accountCode ? ` — ${account.accountCode}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Invoice Grouping
            </label>
            <select
              value={grouping}
              disabled={!accountId}
              onChange={(event) => {
                setGrouping(event.target.value as InvoiceGrouping);
                setPreview(null);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
            >
              <option value="ACCOUNT">One invoice for client account</option>
              <option value="BOOKER">Separate invoice by booker</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Booker
            </label>
            <select
              value={bookerId}
              disabled={grouping !== "BOOKER" || loadingBookers}
              onChange={(event) => {
                setBookerId(event.target.value);
                setPreview(null);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
            >
              <option value="">
                {grouping !== "BOOKER"
                  ? "Not required"
                  : loadingBookers
                    ? "Loading bookers..."
                    : "Select booker..."}
              </option>
              {bookers.map((booker) => (
                <option key={booker.id} value={booker.id}>
                  {booker.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={loadPreview}
            disabled={loadingPreview || !accountId}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingPreview ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Load Monthly Jobs
          </button>
        </div>
      </section>

      {selectedAccount && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Building2 size={19} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Billing Settings</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Defaults used when this client's invoices are generated.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={saveBillingSettings}
              disabled={savingSettings}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {savingSettings ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Billing Settings
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Invoice Email
              </label>
              <input
                type="email"
                value={invoiceEmail}
                onChange={(event) => setInvoiceEmail(event.target.value)}
                placeholder="accounts@client.co.uk"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Payment Due
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={invoiceDueDays}
                  onChange={(event) => setInvoiceDueDays(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm outline-none focus:border-slate-400"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  days
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Billing Address
              </label>
              <div className="min-h-[46px] rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedAccount.billingAddress || "No billing address saved"}
              </div>
            </div>
          </div>
        </section>
      )}

      {preview && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Eligible Jobs
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {preview.bookingCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Net
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {money(preview.totals.netTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                VAT
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {money(preview.totals.vatTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Booking Total
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(preview.totals.bookingTotal)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <UsersRound size={19} className="text-slate-500" />
                <div>
                  <h2 className="font-bold text-slate-900">
                    Monthly Booking Detail
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    These jobs will be snapshotted into the generated invoice.
                  </p>
                </div>
              </div>
            </div>

            {preview.bookings.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Booking</th>
                      <th className="px-5 py-3">Pickup</th>
                      <th className="px-5 py-3">Booker / Passenger</th>
                      <th className="px-5 py-3">Journey</th>
                      <th className="px-5 py-3 text-right">Net</th>
                      <th className="px-5 py-3 text-right">VAT</th>
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {preview.bookings.map((booking) => (
                      <tr key={booking.bookingId}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {booking.bookingReference}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {booking.costCenter || booking.invoiceRef || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {dateTime(booking.pickupDatetime)}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {booking.primaryBooker?.name || "No booker"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Passenger:{" "}
                            {booking.primaryPassenger?.name || "Not specified"}
                          </p>
                        </td>

                        <td className="max-w-[360px] px-5 py-4">
                          <p className="truncate text-sm text-slate-600">
                            {booking.pickupAddress}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            → {booking.dropoffAddress}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-600">
                          {money(booking.finance.netAmount)}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-600">
                          {money(booking.finance.vatAmount)}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                          {money(booking.finance.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-slate-600">
                  No eligible bookings for this selection.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Only completed, uninvoiced ACCOUNT bookings with a final
                  client total are included.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Invoice Notes
                </label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional internal invoice note..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                    Invoice Adjustment
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      £
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustmentTotal}
                      onChange={(event) =>
                        setAdjustmentTotal(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-4 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Use a positive or negative adjustment when required.
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Booking total</span>
                    <span>{money(preview.totals.bookingTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Adjustment</span>
                    <span>{money(Number(adjustmentTotal || 0))}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
                    <span>Amount to charge</span>
                    <span>{money(finalPreviewTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generateInvoice}
                  disabled={generating || preview.bookingCount === 0}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <FilePlus2 size={17} />
                  )}
                  Generate Draft Invoice
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
