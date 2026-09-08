"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import {
  Armchair,
  BadgePoundSterling,
  Building2,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Luggage,
  Mail,
  MapPin,
  NotebookText,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  User,
  UserRound,
  Users,
  UsersRound,
  X,
  XCircle,
  Pencil,
} from "lucide-react";

import api from "@/lib/api";

import { useRouter } from "next/navigation";

type BookingStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ARRIVED"
  | "STARTED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "INACTIVE";

type Driver = {
  id: string;
  name: string;
  phone: string;
  vehicleName: string | null;
  vehicleNumber: string | null;
  status: DriverStatus;
  driverType?: string | null;
  callSign?: string | null;
  driverGrade?: string | null;
};

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

type BookingBooker = {
  id: string;
  bookingId: string;
  bookerId: string;
  isPrimary: boolean;
  position: number;
  createdAt: string;
  booker: Booker;
};

type BookingPassenger = {
  id: string;
  bookingId: string;
  passengerId: string;
  isPrimary: boolean;
  position: number;
  createdAt: string;
  passenger: Passenger;
};

type BookingVia = {
  id: string;
  bookingId: string;
  address: string;
  position: number;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
};

type BookingFinance = {
  id: string;
  bookingId: string;

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
  clientWaitingIncluded: boolean;
  clientParkingIncluded: boolean;
  clientPriceOverride: boolean;

  driverCost: number | null;
  driverWaitingPay: number | null;
  driverParking: number | null;
  driverCongestion: number | null;
  driverTotal: number | null;
  driverWaitingIncluded: boolean;
  driverParkingIncluded: boolean;
  driverPayAsStandard: boolean;
  driverPriceOverride: boolean;

  paymentType: string | null;
  financeNote: string | null;
  invoiceNote: string | null;
  extraNote: string | null;

  createdAt: string;
  updatedAt: string;
};

type BookingStatusHistory = {
  id: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
};

type Booking = {
  id: string;
  bookingReference: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string | null;

  accountId: string | null;
  account?: ClientAccount | null;

  costCenter: string | null;
  invoiceRef: string | null;
  jobStatus: string | null;
  salesman: string | null;
  nameCardOverride: string | null;
  nameCardFileUrl: string | null;

  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;

  journeyType: string | null;
  passengers: number | string | null;
  luggage: number | string | null;

  bigLuggage: number;
  smallLuggage: number;
  babySeats: number;
  childSeats: number;
  boosterSeats: number;

  notes: string | null;
  driverNote: string | null;

  preferredVehicleCategory: string | null;
  requestedDriverType: string | null;
  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;

  status: BookingStatus;
  estimatedDurationMinutes?: number;

  assignedDriverId: string | null;
  assignedDriver: Driver | null;

  bookers?: BookingBooker[];
  passengersList?: BookingPassenger[];
  vias?: BookingVia[];
  finance?: BookingFinance | null;

  acceptedAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  bookingStatusHistories?: BookingStatusHistory[];
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type BookingsResponse = {
  data: Booking[];
  pagination: Pagination;
};

const statusClasses: Record<BookingStatus, string> = {
  PENDING: "border-blue-200 bg-blue-50 text-blue-700",
  ASSIGNED: "border-violet-200 bg-violet-50 text-violet-700",
  ACCEPTED: "border-cyan-200 bg-cyan-50 text-cyan-700",
  ARRIVED: "border-amber-200 bg-amber-50 text-amber-700",
  STARTED: "border-orange-200 bg-orange-50 text-orange-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [driverId, setDriverId] = useState("ALL");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await api.get<Driver[]>("/drivers");
      setDrivers(response.data);
    } catch (err) {
      console.error("Failed to load drivers:", err);
    }
  }, []);

  const fetchBookings = useCallback(
    async (requestedPage = pagination.page, refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = new URLSearchParams();
        params.set("page", String(requestedPage));
        params.set("limit", String(pagination.limit));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (status !== "ALL") {
          params.set("status", status);
        }

        if (driverId !== "ALL") {
          params.set("driverId", driverId);
        }

        const response = await api.get<BookingsResponse>(
          `/bookings?${params.toString()}`,
        );

        setBookings(response.data.data);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        setError("Unable to load bookings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.page, pagination.limit, search, status, driverId],
  );

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    fetchBookings(1);
  }, [search, status, driverId]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput);
  }

  function openBooking(booking: Booking) {
    setSelectedBooking(booking);
    setSelectedDriverId(booking.assignedDriverId || "");
  }

  async function assignDriver() {
    if (!selectedBooking || !selectedDriverId) {
      return;
    }

    try {
      setActionLoading(true);

      await api.patch(`/bookings/${selectedBooking.id}/assign-driver`, {
        driverId: selectedDriverId,
      });

      await fetchBookings(pagination.page, true);

      const driver = drivers.find((item) => item.id === selectedDriverId);

      setSelectedBooking((current) => {
        if (!current) return null;

        return {
          ...current,
          assignedDriverId: selectedDriverId,
          assignedDriver: driver || current.assignedDriver,
          status: current.status === "PENDING" ? "ASSIGNED" : current.status,
        };
      });
    } catch (err: any) {
      console.error("Failed to assign driver:", err);

      const message = err?.response?.data?.message;

      alert(
        Array.isArray(message)
          ? message.join("\n")
          : message || "Unable to assign driver.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelBooking() {
    if (!selectedBooking) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel booking ${selectedBooking.bookingReference}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      await api.patch(`/bookings/${selectedBooking.id}/cancel`);
      setSelectedBooking(null);
      await fetchBookings(pagination.page, true);
    } catch (err: any) {
      console.error("Failed to cancel booking:", err);

      const message = err?.response?.data?.message;

      alert(
        Array.isArray(message)
          ? message.join("\n")
          : message || "Unable to cancel booking.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const canCancel =
    selectedBooking &&
    !["COMPLETED", "CANCELLED", "REJECTED"].includes(selectedBooking.status);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Bookings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer bookings, allocations, finance and journey status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchBookings(pagination.page, true)}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/dashboard/bookings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={16} />
            New Booking
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Bookings"
          value={pagination.total}
          icon={<CalendarDays size={20} />}
        />

        <SummaryCard
          label="Showing"
          value={bookings.length}
          icon={<Eye size={20} />}
        />

        <SummaryCard
          label="Page"
          value={`${pagination.page} / ${Math.max(pagination.totalPages, 1)}`}
          icon={<Clock size={20} />}
        />
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 xl:flex-row">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full max-w-lg gap-2"
            >
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search name, phone or booking reference..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as BookingStatus | "ALL")
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="ARRIVED">Arrived</option>
              <option value="STARTED">Started</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={driverId}
              onChange={(event) => setDriverId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">All drivers</option>

              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                  {driver.vehicleNumber ? ` — ${driver.vehicleNumber}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <Loader2 className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Booking
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pickup
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Journey
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Driver
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
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {booking.bookingReference}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        ID: {booking.id.slice(0, 8)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {booking.customerName}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone size={12} />
                        {booking.customerPhone}
                      </div>
                      {booking.account?.name && (
                        <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                          {booking.account.name}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={15}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {formatDateTime(booking.pickupDatetime)}
                          </p>
                          <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                            {booking.pickupAddress}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-[260px]">
                        <p className="truncate text-sm text-slate-700">
                          {booking.pickupAddress}
                        </p>
                        <p className="my-1 text-xs text-slate-400">↓</p>
                        <p className="truncate text-sm text-slate-700">
                          {booking.dropoffAddress}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {booking.assignedDriver ? (
                        <>
                          <p className="font-medium text-slate-800">
                            {booking.assignedDriver.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {booking.assignedDriver.vehicleNumber ||
                              booking.assignedDriver.vehicleName ||
                              "Vehicle not set"}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-red-500">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={booking.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openBooking(booking)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          <Eye size={15} />
                          View
                        </button>

                        {!["COMPLETED", "CANCELLED", "REJECTED"].includes(
                          booking.status,
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/bookings/${booking.id}/edit`,
                              )
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <CalendarDays
                        size={36}
                        className="mx-auto text-slate-300"
                      />
                      <h3 className="mt-3 font-semibold text-slate-700">
                        No bookings found
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {pagination.total === 0
              ? "No bookings"
              : `Page ${pagination.page} of ${pagination.totalPages} • ${pagination.total} total bookings`}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchBookings(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchBookings(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Booking Drawer */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Booking
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedBooking.bookingReference}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedBooking.status} />

                  {selectedBooking.jobStatus && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Job: {formatStatus(selectedBooking.jobStatus)}
                    </span>
                  )}

                  {!["COMPLETED", "CANCELLED", "REJECTED"].includes(
                    selectedBooking.status,
                  ) && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/bookings/${selectedBooking.id}/edit`,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Pencil size={13} />
                      Edit Booking
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-7 p-6">
              {/* Account Allocation */}
              <section>
                <SectionTitle icon={<Building2 size={14} />}>
                  Account Allocation
                </SectionTitle>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <DetailRow
                    label="Account"
                    value={selectedBooking.account?.name || "—"}
                  />
                  <DetailRow
                    label="Account Code"
                    value={selectedBooking.account?.accountCode || "—"}
                  />
                  <DetailRow
                    label="Cost Center"
                    value={selectedBooking.costCenter || "—"}
                  />
                  <DetailRow
                    label="Invoice Ref"
                    value={selectedBooking.invoiceRef || "—"}
                  />
                  <DetailRow
                    label="Job Status"
                    value={
                      selectedBooking.jobStatus
                        ? formatStatus(selectedBooking.jobStatus)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Salesman"
                    value={selectedBooking.salesman || "—"}
                  />
                  <DetailRow
                    label="Name Card Override"
                    value={selectedBooking.nameCardOverride || "—"}
                  />
                  <DetailRow
                    label="Name Card File"
                    value={selectedBooking.nameCardFileUrl || "—"}
                  />
                </div>
              </section>

              {/* Customer compatibility fields */}
              <section>
                <SectionTitle icon={<User size={14} />}>Customer</SectionTitle>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <DetailRow
                    icon={<User size={15} />}
                    label="Name"
                    value={selectedBooking.customerName}
                  />
                  <DetailRow
                    icon={<Phone size={15} />}
                    label="Phone"
                    value={selectedBooking.customerPhone}
                  />
                  <DetailRow
                    icon={<Mail size={15} />}
                    label="Email"
                    value={selectedBooking.customerEmail || "—"}
                  />
                </div>
              </section>

              {/* Booker */}
              <section>
                <SectionTitle icon={<UserRound size={14} />}>
                  Booker
                </SectionTitle>

                <PeopleList
                  emptyLabel="No booker linked to this booking."
                  items={(selectedBooking.bookers || []).map((item) => ({
                    id: item.id,
                    name: item.booker.name,
                    phone: item.booker.phone,
                    email: item.booker.email,
                    primary: item.isPrimary,
                  }))}
                />
              </section>

              {/* Passengers */}
              <section>
                <SectionTitle icon={<UsersRound size={14} />}>
                  Passengers
                </SectionTitle>

                <PeopleList
                  emptyLabel="No passenger records linked to this booking."
                  items={(selectedBooking.passengersList || []).map((item) => ({
                    id: item.id,
                    name: item.passenger.name,
                    phone: item.passenger.phone,
                    email: item.passenger.email,
                    primary: item.isPrimary,
                  }))}
                />
              </section>

              {/* Journey */}
              <section>
                <SectionTitle icon={<MapPin size={14} />}>Journey</SectionTitle>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <DetailRow
                    icon={<CalendarDays size={15} />}
                    label="Pickup Time"
                    value={formatDateTime(selectedBooking.pickupDatetime)}
                  />
                  <DetailRow
                    icon={<MapPin size={15} />}
                    label="Pickup"
                    value={selectedBooking.pickupAddress}
                  />

                  {(selectedBooking.vias || [])
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((via, index) => (
                      <DetailRow
                        key={via.id}
                        icon={<MapPin size={15} />}
                        label={`Via ${index + 1}`}
                        value={via.address}
                      />
                    ))}

                  <DetailRow
                    icon={<MapPin size={15} />}
                    label="Drop Off"
                    value={selectedBooking.dropoffAddress}
                  />
                  <DetailRow
                    label="Journey Type"
                    value={
                      selectedBooking.journeyType
                        ? formatStatus(selectedBooking.journeyType)
                        : "—"
                    }
                  />
                  <DetailRow
                    icon={<Clock size={15} />}
                    label="Estimated Duration"
                    value={
                      selectedBooking.estimatedDurationMinutes
                        ? `${selectedBooking.estimatedDurationMinutes} minutes`
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Route Distance"
                    value={formatDistance(selectedBooking.routeDistanceMeters)}
                  />
                  <DetailRow
                    label="Route Duration"
                    value={formatRouteDuration(
                      selectedBooking.routeDurationSeconds,
                    )}
                  />
                </div>
              </section>

              {/* Passenger & luggage requirements */}
              <section>
                <SectionTitle icon={<Luggage size={14} />}>
                  Passenger & Luggage Requirements
                </SectionTitle>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Passengers"
                    value={String(selectedBooking.passengers ?? "—")}
                    icon={<Users size={15} />}
                  />
                  <MiniStat
                    label="Total Luggage"
                    value={String(selectedBooking.luggage ?? "—")}
                    icon={<Luggage size={15} />}
                  />
                  <MiniStat
                    label="Big Luggage"
                    value={String(selectedBooking.bigLuggage ?? 0)}
                    icon={<Luggage size={15} />}
                  />
                  <MiniStat
                    label="Small Luggage"
                    value={String(selectedBooking.smallLuggage ?? 0)}
                    icon={<Luggage size={15} />}
                  />
                  <MiniStat
                    label="Baby Seats"
                    value={String(selectedBooking.babySeats ?? 0)}
                    icon={<Armchair size={15} />}
                  />
                  <MiniStat
                    label="Child Seats"
                    value={String(selectedBooking.childSeats ?? 0)}
                    icon={<Armchair size={15} />}
                  />
                  <MiniStat
                    label="Booster Seats"
                    value={String(selectedBooking.boosterSeats ?? 0)}
                    icon={<Armchair size={15} />}
                  />
                </div>
              </section>

              {/* Vehicle request */}
              <section>
                <SectionTitle icon={<Car size={14} />}>
                  Vehicle & Driver Request
                </SectionTitle>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <DetailRow
                    label="Preferred Vehicle Category"
                    value={selectedBooking.preferredVehicleCategory || "—"}
                  />
                  <DetailRow
                    label="Requested Driver Type"
                    value={selectedBooking.requestedDriverType || "Any"}
                  />
                </div>
              </section>

              {/* Driver Assignment */}
              <section>
                <SectionTitle icon={<Car size={14} />}>
                  Driver Assignment
                </SectionTitle>

                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  {selectedBooking.assignedDriver && (
                    <div className="mb-4 rounded-lg bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {selectedBooking.assignedDriver.name}
                        </p>

                        {selectedBooking.assignedDriver.callSign && (
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            {selectedBooking.assignedDriver.callSign}
                          </span>
                        )}

                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                          {formatStatus(selectedBooking.assignedDriver.status)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {selectedBooking.assignedDriver.driverType || "Driver"}
                        {selectedBooking.assignedDriver.driverGrade
                          ? ` • ${selectedBooking.assignedDriver.driverGrade}`
                          : ""}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {selectedBooking.assignedDriver.vehicleName ||
                          "Vehicle not set"}
                        {selectedBooking.assignedDriver.vehicleNumber
                          ? ` • ${selectedBooking.assignedDriver.vehicleNumber}`
                          : ""}
                      </p>
                    </div>
                  )}

                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {selectedBooking.assignedDriver
                      ? "Reassign Driver"
                      : "Assign Driver"}
                  </label>

                  <select
                    value={selectedDriverId}
                    onChange={(event) =>
                      setSelectedDriverId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="">Select driver</option>

                    {drivers.map((driver) => (
                      <option
                        key={driver.id}
                        value={driver.id}
                        disabled={driver.status === "INACTIVE"}
                      >
                        {driver.callSign ? `${driver.callSign} — ` : ""}
                        {driver.name}
                        {" — "}
                        {driver.vehicleName || "No vehicle"}
                        {" — "}
                        {formatStatus(driver.status)}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-slate-400">
                    Inactive drivers cannot receive bookings. Busy and offline
                    drivers remain available for future work; schedule conflicts
                    are checked by the backend.
                  </p>

                  <button
                    type="button"
                    disabled={!selectedDriverId || actionLoading}
                    onClick={assignDriver}
                    className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : selectedBooking.assignedDriver ? (
                      "Reassign Driver"
                    ) : (
                      "Assign Driver"
                    )}
                  </button>
                </div>
              </section>

              {/* Notes */}
              <section>
                <SectionTitle icon={<NotebookText size={14} />}>
                  Booking Notes
                </SectionTitle>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <NoteCard
                    title="General Booking Note"
                    value={selectedBooking.notes}
                  />
                  <NoteCard
                    title="Driver Note"
                    value={selectedBooking.driverNote}
                  />
                </div>
              </section>

              {/* Client Finance */}
              <section>
                <SectionTitle icon={<BadgePoundSterling size={14} />}>
                  Client Finance
                </SectionTitle>

                {selectedBooking.finance ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <FinanceValue
                        label="Quote"
                        value={selectedBooking.finance.clientQuote}
                      />
                      <FinanceValue
                        label="Waiting"
                        value={selectedBooking.finance.clientWaitingCharge}
                      />
                      <FinanceValue
                        label="Parking"
                        value={selectedBooking.finance.clientParking}
                      />
                      <FinanceValue
                        label="Congestion"
                        value={selectedBooking.finance.clientCongestion}
                      />
                      <FinanceValue
                        label="Discount"
                        value={selectedBooking.finance.clientDiscount}
                      />
                      <FinanceValue
                        label="Total"
                        value={selectedBooking.finance.clientTotal}
                      />
                      <FinanceValue
                        label="Admin Fee"
                        value={selectedBooking.finance.clientAdminFee}
                      />
                      <FinanceValue
                        label="Net"
                        value={selectedBooking.finance.clientNet}
                      />
                      <FinanceValue
                        label="VAT"
                        value={selectedBooking.finance.clientVat}
                      />
                      <FinanceValue
                        label="VAT %"
                        value={selectedBooking.finance.clientVatPercent}
                        money={false}
                        suffix="%"
                      />
                      <FinanceValue
                        label="Total Amount"
                        value={selectedBooking.finance.clientTotalAmount}
                        emphasis
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <BooleanBadge
                        label="Waiting Included"
                        value={selectedBooking.finance.clientWaitingIncluded}
                      />
                      <BooleanBadge
                        label="Parking Included"
                        value={selectedBooking.finance.clientParkingIncluded}
                      />
                      <BooleanBadge
                        label="Price Override"
                        value={selectedBooking.finance.clientPriceOverride}
                      />
                      <TextBadge
                        label="Payment Type"
                        value={
                          selectedBooking.finance.paymentType
                            ? formatStatus(selectedBooking.finance.paymentType)
                            : "—"
                        }
                      />
                    </div>
                  </>
                ) : (
                  <EmptyPanel>No client finance data saved.</EmptyPanel>
                )}
              </section>

              {/* Driver Finance */}
              <section>
                <SectionTitle icon={<BadgePoundSterling size={14} />}>
                  Driver Finance
                </SectionTitle>

                {selectedBooking.finance ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <FinanceValue
                        label="Driver Cost"
                        value={selectedBooking.finance.driverCost}
                      />
                      <FinanceValue
                        label="Waiting Pay"
                        value={selectedBooking.finance.driverWaitingPay}
                      />
                      <FinanceValue
                        label="Parking"
                        value={selectedBooking.finance.driverParking}
                      />
                      <FinanceValue
                        label="Congestion"
                        value={selectedBooking.finance.driverCongestion}
                      />
                      <FinanceValue
                        label="Driver Total"
                        value={selectedBooking.finance.driverTotal}
                        emphasis
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <BooleanBadge
                        label="Waiting Included"
                        value={selectedBooking.finance.driverWaitingIncluded}
                      />
                      <BooleanBadge
                        label="Parking Included"
                        value={selectedBooking.finance.driverParkingIncluded}
                      />
                      <BooleanBadge
                        label="Pay As Standard"
                        value={selectedBooking.finance.driverPayAsStandard}
                      />
                      <BooleanBadge
                        label="Price Override"
                        value={selectedBooking.finance.driverPriceOverride}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyPanel>No driver finance data saved.</EmptyPanel>
                )}
              </section>

              {/* Finance Notes */}
              <section>
                <SectionTitle icon={<ReceiptText size={14} />}>
                  Finance & Invoice Notes
                </SectionTitle>

                {selectedBooking.finance ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <NoteCard
                      title="Finance Note"
                      value={selectedBooking.finance.financeNote}
                    />
                    <NoteCard
                      title="Invoice Note"
                      value={selectedBooking.finance.invoiceNote}
                    />
                    <div className="md:col-span-2">
                      <NoteCard
                        title="Additional Internal Note"
                        value={selectedBooking.finance.extraNote}
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyPanel>No finance notes saved.</EmptyPanel>
                )}
              </section>

              {/* Status History */}
              <section>
                <SectionTitle icon={<Clock size={14} />}>
                  Status History
                </SectionTitle>

                <div className="mt-4">
                  {selectedBooking.bookingStatusHistories?.length ? (
                    <div className="space-y-0">
                      {[...selectedBooking.bookingStatusHistories]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((history, index) => (
                          <div
                            key={history.id}
                            className="relative flex gap-4 pb-5"
                          >
                            {index <
                              (selectedBooking.bookingStatusHistories?.length ||
                                0) -
                                1 && (
                              <div className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />
                            )}

                            <div className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-slate-900 shadow-sm" />

                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {formatStatus(history.status)}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDateTime(history.createdAt)}
                              </p>
                              {history.notes && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {history.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No status history available.
                    </p>
                  )}
                </div>
              </section>

              {/* Danger */}
              {canCancel && (
                <section className="border-t border-slate-200 pt-6">
                  <button
                    type="button"
                    onClick={cancelBooking}
                    disabled={actionLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={17} />
                    Cancel Booking
                  </button>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDistance(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  const miles = value / 1609.344;
  return `${miles.toFixed(1)} miles (${(value / 1000).toFixed(1)} km)`;
}

function formatRouteDuration(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
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

function SectionTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <h3 className="text-xs font-semibold uppercase tracking-wider">
        {children}
      </h3>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 first:pt-0 last:border-0 last:pb-0">
      {icon && <div className="mt-0.5 text-slate-400">{icon}</div>}

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function PeopleList({
  items,
  emptyLabel,
}: {
  items: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    primary: boolean;
  }>;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <EmptyPanel>{emptyLabel}</EmptyPanel>;
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-800">{item.name}</p>
            {item.primary && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                Primary
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            {item.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone size={12} />
                {item.phone}
              </span>
            )}
            {item.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail size={12} />
                {item.email}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function FinanceValue({
  label,
  value,
  money = true,
  suffix = "",
  emphasis = false,
}: {
  label: string;
  value: number | null | undefined;
  money?: boolean;
  suffix?: string;
  emphasis?: boolean;
}) {
  const rendered =
    value === null || value === undefined
      ? "—"
      : money
        ? formatMoney(value)
        : `${value}${suffix}`;

  return (
    <div
      className={`rounded-xl border p-4 ${
        emphasis
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          emphasis ? "text-slate-300" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-base font-bold ${
          emphasis ? "text-white" : "text-slate-800"
        }`}
      >
        {rendered}
      </p>
    </div>
  );
}

function BooleanBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <span
        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
          value
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

function TextBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function NoteCard({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-400">
      {children}
    </div>
  );
}
