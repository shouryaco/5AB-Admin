"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import api from "@/lib/api";

type ClientAccount = {
  id: string;
  name: string;
  accountCode?: string | null;
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  vehicleName?: string | null;
  vehicleNumber?: string | null;
};

type Passenger = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type BookingPassenger = {
  id: string;
  isPrimary: boolean;
  position: number;
  passenger: Passenger;
};

type BookingFinance = {
  clientQuote: number | null;
  clientWaitingCharge: number | null;
  clientParking: number | null;
  clientCongestion: number | null;
  clientDiscount: number | null;
  clientTotal: number | null;
  clientAdminFee: number | null;
  clientNet: number | null;
  clientVat: number | null;
  clientVatPercent: number | null;
  clientTotalAmount: number | null;
  clientPriceOverride: boolean;
  paymentType: string | null;
  financeNote: string | null;
  invoiceNote: string | null;
};

type ClearedBooking = {
  id: string;
  bookingReference: string;

  accountId: string | null;
  account: ClientAccount | null;

  invoiceRef: string | null;
  costCenter: string | null;

  customerName: string;
  customerPhone: string;

  pickupDatetime: string;
  pickupAddress: string;
  dropoffAddress: string;

  journeyType: string | null;
  preferredVehicleCategory: string | null;

  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;

  completedAt: string | null;

  assignedDriverId: string | null;
  assignedDriver: Driver | null;

  passengersList: BookingPassenger[];

  finance: BookingFinance | null;
};

type ClearedResponse = {
  data: ClearedBooking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    search: string | null;
    fromDate: string | null;
    toDate: string | null;
    month: string | null;
    accountId: string | null;
    driverId: string | null;
    paymentType: string | null;
    priceReview: "YES" | "NO" | null;
  };
};

type Filters = {
  search: string;
  fromDate: string;
  toDate: string;
  month: string;
  accountId: string;
  driverId: string;
  paymentType: string;
  priceReview: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  fromDate: "",
  toDate: "",
  month: "",
  accountId: "",
  driverId: "",
  paymentType: "",
  priceReview: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      }
    ).response;

    const message = response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function buildParams(filters: Filters, page: number, limit: number) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.fromDate) {
    params.set("fromDate", filters.fromDate);
  }

  if (filters.toDate) {
    params.set("toDate", filters.toDate);
  }

  if (filters.month) {
    params.set("month", filters.month);
  }

  if (filters.accountId) {
    params.set("accountId", filters.accountId);
  }

  if (filters.driverId) {
    params.set("driverId", filters.driverId);
  }

  if (filters.paymentType) {
    params.set("paymentType", filters.paymentType);
  }

  if (filters.priceReview) {
    params.set("priceReview", filters.priceReview);
  }

  params.set("page", String(page));
  params.set("limit", String(limit));

  return params;
}

function formatJobDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatJobTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatCompletedAt(value: string | null) {
  if (!value) return "—";

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

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDistance(meters: number | null) {
  if (meters === null) {
    return "—";
  }

  const miles = meters / 1609.344;

  return `${miles.toFixed(1)} mi`;
}

function getPassengerName(booking: ClearedBooking) {
  const primary = booking.passengersList.find((item) => item.isPrimary);

  return (
    primary?.passenger.name ||
    booking.passengersList[0]?.passenger.name ||
    booking.customerName
  );
}

function getTotal(booking: ClearedBooking) {
  return (
    booking.finance?.clientTotalAmount ?? booking.finance?.clientTotal ?? null
  );
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

export default function ClearedBookingsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const [bookings, setBookings] = useState<ClearedBooking[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<ClearedBooking | null>(
    null,
  );

  const loadPresets = useCallback(async () => {
    try {
      const [accountResponse, driverResponse] = await Promise.all([
        api.get<ClientAccount[]>("/clients/accounts"),
        api.get<Driver[]>("/drivers"),
      ]);

      setAccounts(accountResponse.data);
      setDrivers(driverResponse.data);
    } catch (error) {
      console.error("Unable to load cleared booking filters:", error);
    }
  }, []);

  const loadBookings = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = buildParams(appliedFilters, page, limit);

        const response = await api.get<ClearedResponse>(
          `/bookings/cleared?${params.toString()}`,
        );

        setBookings(response.data.data);
        setPagination(response.data.pagination);
      } catch (error) {
        console.error("Unable to load cleared bookings:", error);

        setError(getErrorMessage(error, "Unable to load cleared bookings."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedFilters, page, limit],
  );

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();

    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  async function exportCsv() {
    try {
      setExporting(true);
      setError("");

      const allRows: ClearedBooking[] = [];

      let exportPage = 1;
      let totalPages = 1;

      do {
        const params = buildParams(appliedFilters, exportPage, 100);

        const response = await api.get<ClearedResponse>(
          `/bookings/cleared?${params.toString()}`,
        );

        allRows.push(...response.data.data);

        totalPages = response.data.pagination.totalPages;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const header = [
        "Account Name",
        "Job No.",
        "Job Ref",
        "Job Date",
        "Time",
        "Passenger",
        "Job Type",
        "Requested Vehicle",
        "Pick Up Address",
        "Drop Off Address",
        "Route Distance",
        "Driver",
        "Total",
        "Finance Note",
        "Payment Type",
        "Price Review",
        "Completed At",
      ];

      const rows = allRows.map((booking) => [
        booking.account?.name || "",
        booking.bookingReference,
        booking.invoiceRef || "",
        formatJobDate(booking.pickupDatetime),
        formatJobTime(booking.pickupDatetime),
        getPassengerName(booking),
        booking.journeyType || "",
        booking.preferredVehicleCategory || "",
        booking.pickupAddress,
        booking.dropoffAddress,
        formatDistance(booking.routeDistanceMeters),
        booking.assignedDriver?.name || "",
        getTotal(booking) ?? "",
        booking.finance?.financeNote || "",
        booking.finance?.paymentType || "",
        booking.finance?.clientPriceOverride ? "Yes" : "No",
        formatCompletedAt(booking.completedAt),
      ]);

      const csv = [
        header.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\n");

      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const today = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `5ab-cleared-bookings-${today}.csv`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Unable to export cleared bookings:", error);

      setError(getErrorMessage(error, "Unable to export cleared bookings."));
    } finally {
      setExporting(false);
    }
  }

  const showingFrom = useMemo(() => {
    if (pagination.total === 0) return 0;

    return (pagination.page - 1) * pagination.limit + 1;
  }, [pagination]);

  const showingTo = useMemo(() => {
    return Math.min(pagination.page * pagination.limit, pagination.total);
  }, [pagination]);

  return (
    <div className="space-y-5 p-4 lg:p-5">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CalendarDays size={17} />
            Completed jobs
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Cleared Bookings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Search, review and export all completed chauffeur bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadBookings(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}

            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Search
            </label>

            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Job no., passenger, account, driver, address..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              From Date
            </label>

            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter("fromDate", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              To Date
            </label>

            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter("toDate", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Month
            </label>

            <input
              type="month"
              value={filters.month}
              onChange={(event) => updateFilter("month", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Account
            </label>

            <select
              value={filters.accountId}
              onChange={(event) =>
                updateFilter("accountId", event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">All accounts</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.accountCode ? ` (${account.accountCode})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Driver
            </label>

            <select
              value={filters.driverId}
              onChange={(event) => updateFilter("driverId", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">All drivers</option>

              {drivers
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Payment Type
            </label>

            <select
              value={filters.paymentType}
              onChange={(event) =>
                updateFilter("paymentType", event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">All payment types</option>
              <option value="ACCOUNT">Account</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Price Review
            </label>

            <select
              value={filters.priceReview}
              onChange={(event) =>
                updateFilter("priceReview", event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">All</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Search size={16} />
            Apply Filters
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          TABLE
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Completed Jobs</h2>

            <p className="mt-1 text-xs text-slate-500">
              {pagination.total.toLocaleString("en-GB")} cleared bookings found
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="cleared-page-size"
              className="text-xs font-medium text-slate-500"
            >
              Rows
            </label>

            <select
              id="cleared-page-size"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">
                Loading cleared bookings...
              </p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CalendarDays size={34} className="mx-auto text-slate-300" />

            <h3 className="mt-4 font-semibold text-slate-700">
              No cleared bookings found
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Try adjusting the current filters.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-slate-950 text-white">
                  {[
                    "Account Name",
                    "Job No.",
                    "Job Ref",
                    "Job Date",
                    "Time",
                    "Passenger",
                    "Job Type",
                    "Req. Vehicle",
                    "Pick Up Address",
                    "Drop Off Address",
                    "Route Distance",
                    "Driver",
                    "Total",
                    "Finance Note",
                    "Payment Type",
                    "Price Review",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border-r border-white/10 px-1.5 py-2 text-[9px] font-semibold uppercase leading-3 tracking-tight last:border-r-0"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-slate-100 align-top transition last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-1.5 py-2 text-xs font-medium text-slate-700">
                      <div className="max-w-[150px]">
                        {booking.account?.name || "—"}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <p className="text-xs font-bold text-blue-600">
                        {booking.bookingReference}
                      </p>
                    </td>

                    <td className="px-1.5 py-2 text-xs text-slate-600">
                      {booking.invoiceRef || "—"}
                    </td>

                    <td className="px-1.5 py-2 whitespace-nowrap text-xs text-slate-700">
                      {formatJobDate(booking.pickupDatetime)}
                    </td>

                    <td className="px-1.5 py-2 whitespace-nowrap text-xs font-semibold text-slate-700">
                      {formatJobTime(booking.pickupDatetime)}
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[180px] text-xs leading-5 text-slate-700">
                        {getPassengerName(booking)}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[130px] text-xs leading-5 text-slate-600">
                        {booking.journeyType || "—"}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[145px] text-xs leading-5 text-slate-600">
                        {booking.preferredVehicleCategory || "—"}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[230px] text-xs leading-5 text-slate-600">
                        {booking.pickupAddress}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[230px] text-xs leading-5 text-slate-600">
                        {booking.dropoffAddress}
                      </div>
                    </td>

                    <td className="px-1.5 py-2 whitespace-nowrap text-xs text-slate-600">
                      {formatDistance(booking.routeDistanceMeters)}
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[140px]">
                        <p className="text-xs font-semibold text-blue-600">
                          {booking.assignedDriver?.name || "—"}
                        </p>

                        {booking.assignedDriver?.vehicleNumber && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {booking.assignedDriver.vehicleNumber}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-1.5 py-2 whitespace-nowrap text-xs font-semibold text-slate-800">
                      {formatMoney(getTotal(booking))}
                    </td>

                    <td className="px-1.5 py-2">
                      <div className="max-w-[180px] text-xs leading-5 text-slate-500">
                        {booking.finance?.financeNote || "—"}
                      </div>
                    </td>

                    <td className="px-1.5 py-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {booking.finance?.paymentType || "—"}
                      </span>
                    </td>

                    <td className="px-1.5 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          booking.finance?.clientPriceOverride
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {booking.finance?.clientPriceOverride ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="px-1.5 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 transition hover:bg-blue-50"
                        title="View cleared booking"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =================================================
            PAGINATION
        ================================================= */}

        {!loading && pagination.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing <strong className="text-slate-700">{showingFrom}</strong>{" "}
              to <strong className="text-slate-700">{showingTo}</strong> of{" "}
              <strong className="text-slate-700">{pagination.total}</strong>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1),
                  )
                }
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =================================================
          VIEW DRAWER
      ================================================= */}

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cleared Booking
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedBooking.bookingReference}
                </h2>

                <span className="mt-2 inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Completed
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <DetailSection title="Job">
                <DetailRow
                  label="Account"
                  value={selectedBooking.account?.name || "—"}
                />
                <DetailRow
                  label="Job No."
                  value={selectedBooking.bookingReference}
                />
                <DetailRow
                  label="Job Ref"
                  value={selectedBooking.invoiceRef || "—"}
                />
                <DetailRow
                  label="Passenger"
                  value={getPassengerName(selectedBooking)}
                />
                <DetailRow
                  label="Job Type"
                  value={selectedBooking.journeyType || "—"}
                />
                <DetailRow
                  label="Requested Vehicle"
                  value={selectedBooking.preferredVehicleCategory || "—"}
                />
              </DetailSection>

              <DetailSection title="Journey">
                <DetailRow
                  label="Job Date"
                  value={formatJobDate(selectedBooking.pickupDatetime)}
                />
                <DetailRow
                  label="Time"
                  value={formatJobTime(selectedBooking.pickupDatetime)}
                />
                <DetailRow
                  label="Pickup"
                  value={selectedBooking.pickupAddress}
                />
                <DetailRow
                  label="Drop Off"
                  value={selectedBooking.dropoffAddress}
                />
                <DetailRow
                  label="Route Distance"
                  value={formatDistance(selectedBooking.routeDistanceMeters)}
                />
                <DetailRow
                  label="Completed At"
                  value={formatCompletedAt(selectedBooking.completedAt)}
                />
              </DetailSection>

              <DetailSection title="Driver">
                <DetailRow
                  label="Driver"
                  value={selectedBooking.assignedDriver?.name || "—"}
                />
                <DetailRow
                  label="Vehicle"
                  value={selectedBooking.assignedDriver?.vehicleName || "—"}
                />
                <DetailRow
                  label="Vehicle Number"
                  value={selectedBooking.assignedDriver?.vehicleNumber || "—"}
                />
              </DetailSection>

              <DetailSection title="Finance">
                <DetailRow
                  label="Total"
                  value={formatMoney(getTotal(selectedBooking))}
                />
                <DetailRow
                  label="Payment Type"
                  value={selectedBooking.finance?.paymentType || "—"}
                />
                <DetailRow
                  label="Price Review"
                  value={
                    selectedBooking.finance?.clientPriceOverride ? "Yes" : "No"
                  }
                />
                <DetailRow
                  label="Finance Note"
                  value={selectedBooking.finance?.financeNote || "—"}
                />
                <DetailRow
                  label="Invoice Note"
                  value={selectedBooking.finance?.invoiceNote || "—"}
                />
              </DetailSection>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>

      <div className="mt-3 rounded-xl border border-slate-200 p-4">
        {children}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium text-slate-400">{label}</p>

      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}
