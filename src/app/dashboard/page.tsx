"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleOff,
  Clock3,
  CreditCard,
  Eraser,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Route,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import {
  getBookingStatusClass,
  getBookingStatusLabel,
} from "@/lib/booking-status-ui";

type DashboardOverview = {
  totalBookings: number;
  activeTrips: number;
  completedTrips: number;
  cancelledTrips: number;

  drivers: {
    availableDrivers: number;
    busyDrivers: number;
    offlineDrivers: number;
    inactiveDrivers: number;
  };
};

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
  accountCode?: string | null;
};

type BookingFinance = {
  paymentType?: string | null;
};

type Booking = {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone?: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  passengers: number | string | null;
  luggage: number | string | null;
  journeyType?: string | null;
  jobStatus?: string | null;
  status: BookingStatus;
  accountId?: string | null;
  account?: ClientAccount | null;
  finance?: BookingFinance | null;
  assignedDriverId?: string | null;
  assignedDriver?: Driver | null;
};

type BookingsResponse = {
  data: Booking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type DispatchSummary = {
  unassignedCount: number;
  activeCount: number;
  upcomingCount: number;
  availableDrivers: number;
  busyDrivers: number;
  offlineDrivers?: number;
  inactiveDrivers?: number;
};

type DispatchData = {
  summary: DispatchSummary;
  unassignedBookings: Booking[];
  activeBookings: Booking[];
  upcomingBookings: Booking[];
  availableDrivers: Driver[];
  busyDrivers: Driver[];
  offlineDrivers?: Driver[];
  inactiveDrivers?: Driver[];
};

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
};

type DashboardFilters = {
  search: string;
  driverId: string;
  vehicle: string;
  accountId: string;
  fromDate: string;
  toDate: string;
  journeyType: string;
  paymentType: string;
  status: string;
};

const emptyFilters: DashboardFilters = {
  search: "",
  driverId: "",
  vehicle: "",
  accountId: "",
  fromDate: "",
  toDate: "",
  journeyType: "",
  paymentType: "",
  status: "",
};

const allStatuses: BookingStatus[] = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "ARRIVED",
  "STARTED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [dispatch, setDispatch] = useState<DispatchData | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAllBookings = useCallback(async () => {
    const first = await api.get<BookingsResponse>("/bookings?page=1&limit=100");
    const totalPages = Math.max(1, first.data.pagination.totalPages || 1);

    if (totalPages === 1) {
      return first.data.data;
    }

    const remainingResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get<BookingsResponse>(`/bookings?page=${index + 2}&limit=100`),
      ),
    );

    return [
      ...first.data.data,
      ...remainingResponses.flatMap((response) => response.data.data),
    ];
  }, []);

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setSearchLoading(true);
        setError("");

        const [
          overviewResponse,
          dispatchResponse,
          driverResponse,
          accountResponse,
          bookings,
        ] = await Promise.all([
          api.get<DashboardOverview>("/admin/dashboard/overview"),
          api.get<DispatchData>("/admin/dashboard/dispatch-board"),
          api.get<Driver[]>("/drivers"),
          api.get<ClientAccount[]>("/clients/accounts?active=true"),
          fetchAllBookings(),
        ]);

        setOverview(overviewResponse.data);
        setDispatch(dispatchResponse.data);
        setDrivers(driverResponse.data);
        setAccounts(accountResponse.data);
        setAllBookings(bookings);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError("Unable to load dashboard information.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setSearchLoading(false);
      }
    },
    [fetchAllBookings],
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const upcomingBookings = useMemo(() => {
    return [...(dispatch?.upcomingBookings || [])]
      .sort(
        (a, b) =>
          new Date(a.pickupDatetime).getTime() -
          new Date(b.pickupDatetime).getTime(),
      )
      .slice(0, 5);
  }, [dispatch]);

  const unassignedBookings = useMemo(() => {
    return [...(dispatch?.unassignedBookings || [])]
      .sort(
        (a, b) =>
          new Date(a.pickupDatetime).getTime() -
          new Date(b.pickupDatetime).getTime(),
      )
      .slice(0, 5);
  }, [dispatch]);

  const vehicleOptions = useMemo(() => {
    const unique = new Map<string, string>();

    drivers.forEach((driver) => {
      const name = driver.vehicleName?.trim();
      const number = driver.vehicleNumber?.trim();

      if (!name && !number) return;

      const key = `${name || ""}||${number || ""}`;
      const label = [name, number].filter(Boolean).join(" — ");
      unique.set(key, label);
    });

    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [drivers]);

  const journeyTypes = useMemo(() => {
    return Array.from(
      new Set(
        allBookings
          .map((booking) => booking.journeyType?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
  }, [allBookings]);

  const paymentTypes = useMemo(() => {
    return Array.from(
      new Set(
        allBookings
          .map((booking) => booking.finance?.paymentType?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
  }, [allBookings]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim() !== ""),
    [filters],
  );

  const filteredBookings = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return allBookings
      .filter((booking) => {
        if (term) {
          const searchable = [
            booking.bookingReference,
            booking.customerName,
            booking.customerPhone,
            booking.pickupAddress,
            booking.dropoffAddress,
            booking.account?.name,
            booking.account?.accountCode,
            booking.assignedDriver?.name,
            booking.assignedDriver?.vehicleName,
            booking.assignedDriver?.vehicleNumber,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());

          if (!searchable.some((value) => value.includes(term))) {
            return false;
          }
        }

        if (
          filters.driverId &&
          booking.assignedDriverId !== filters.driverId
        ) {
          return false;
        }

        if (filters.vehicle) {
          const [vehicleName, vehicleNumber] = filters.vehicle.split("||");

          if (
            (booking.assignedDriver?.vehicleName || "") !== vehicleName ||
            (booking.assignedDriver?.vehicleNumber || "") !== vehicleNumber
          ) {
            return false;
          }
        }

        if (filters.accountId && booking.accountId !== filters.accountId) {
          return false;
        }

        const londonDate = londonDateKey(booking.pickupDatetime);

        if (filters.fromDate && londonDate < filters.fromDate) {
          return false;
        }

        if (filters.toDate && londonDate > filters.toDate) {
          return false;
        }

        if (
          filters.journeyType &&
          booking.journeyType !== filters.journeyType
        ) {
          return false;
        }

        if (
          filters.paymentType &&
          booking.finance?.paymentType !== filters.paymentType
        ) {
          return false;
        }

        if (filters.status && booking.status !== filters.status) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.pickupDatetime).getTime() -
          new Date(a.pickupDatetime).getTime(),
      );
  }, [allBookings, filters]);

  function updateFilter(key: keyof DashboardFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-100" />

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !overview || !dispatch) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-700">Dashboard unavailable</h2>

          <p className="mt-1 text-sm text-red-600">
            {error || "Unable to load dashboard information."}
          </p>

          <button
            type="button"
            onClick={() => fetchDashboard()}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalDrivers =
    overview.drivers.availableDrivers +
    overview.drivers.busyDrivers +
    overview.drivers.offlineDrivers +
    overview.drivers.inactiveDrivers;

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Live overview of bookings, dispatch activity and driver availability.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />

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

      {/* Search Options */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Filter size={17} className="text-slate-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Search Bookings</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Search across bookings by driver, vehicle, client, dates and status.
              </p>
            </div>
          </div>

          {searchLoading && (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <FilterControl icon={<Search size={14} />}>
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Booking ref, passenger, address..."
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </FilterControl>

          <FilterControl icon={<UserRound size={14} />}>
            <select
              value={filters.driverId}
              onChange={(event) => updateFilter("driverId", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="">All Drivers</option>
              {drivers
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
            </select>
          </FilterControl>

          <FilterControl icon={<Car size={14} />}>
            <select
              value={filters.vehicle}
              onChange={(event) => updateFilter("vehicle", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="">All Vehicles</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle.value} value={vehicle.value}>
                  {vehicle.label}
                </option>
              ))}
            </select>
          </FilterControl>

          <FilterControl icon={<Building2 size={14} />}>
            <select
              value={filters.accountId}
              onChange={(event) => updateFilter("accountId", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="">All Clients</option>
              {accounts
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>
          </FilterControl>

          <FilterControl icon={<CalendarDays size={14} />}>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter("fromDate", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
              aria-label="Choose from date"
            />
          </FilterControl>

          <FilterControl icon={<CalendarDays size={14} />}>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter("toDate", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
              aria-label="Choose to date"
            />
          </FilterControl>

          <FilterControl icon={<Route size={14} />}>
            <select
              value={filters.journeyType}
              onChange={(event) => updateFilter("journeyType", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="">All Bookings</option>
              {journeyTypes.map((journeyType) => (
                <option key={journeyType} value={journeyType}>
                  {formatStatus(journeyType)}
                </option>
              ))}
            </select>
          </FilterControl>

          <FilterControl icon={<CreditCard size={14} />}>
            <select
              value={filters.paymentType}
              onChange={(event) => updateFilter("paymentType", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="">All Payment Types</option>
              {paymentTypes.map((paymentType) => (
                <option key={paymentType} value={paymentType}>
                  {formatStatus(paymentType)}
                </option>
              ))}
            </select>
          </FilterControl>

          <FilterControl icon={<CheckCircle2 size={14} />}>
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
            >
              <option value="">All Status</option>
              {allStatuses.map((status) => (
                <option key={status} value={status}>
                  {getBookingStatusLabel(status)}
                </option>
              ))}
            </select>
          </FilterControl>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eraser size={14} />
            Clear Filter
          </button>
        </div>
      </section>

      {hasActiveFilters && (
        <SearchResults bookings={filteredBookings} />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          href="/dashboard/dispatch"
          title="Open Dispatch"
          description={`${dispatch.summary.unassignedCount} unassigned • ${dispatch.summary.activeCount} active`}
          icon={<Route size={18} />}
        />

        <QuickAction
          href="/dashboard/bookings"
          title="Manage Bookings"
          description={`${overview.totalBookings} bookings in the system`}
          icon={<CalendarDays size={18} />}
        />

        <QuickAction
          href="/dashboard/drivers"
          title="Manage Drivers"
          description={`${overview.drivers.availableDrivers} currently available`}
          icon={<Car size={18} />}
        />

        <QuickAction
          href="/dashboard/clients"
          title="Manage Clients"
          description="Accounts, bookers and passengers"
          icon={<UserRound size={18} />}
        />
      </div>

      {/* Booking Statistics */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-slate-500" />

          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Booking Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Bookings"
            value={overview.totalBookings}
            description="All bookings currently stored"
            icon={<CalendarDays size={22} />}
          />

          <StatCard
            title="Active Trips"
            value={overview.activeTrips}
            description="Accepted, arrived or started journeys"
            icon={<Car size={22} />}
          />

          <StatCard
            title="Completed Trips"
            value={overview.completedTrips}
            description="Successfully completed journeys"
            icon={<CheckCircle2 size={22} />}
          />

          <StatCard
            title="Cancelled Trips"
            value={overview.cancelledTrips}
            description="Bookings cancelled in the system"
            icon={<XCircle size={22} />}
          />
        </div>
      </section>

      {/* Operational snapshot */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Route size={18} className="text-slate-500" />

          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Operations
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <OperationalPanel
            title="Needs Assignment"
            description="Pending bookings without a driver"
            count={dispatch.summary.unassignedCount}
            icon={<AlertCircle size={18} />}
            emptyText="No unassigned bookings."
            items={unassignedBookings}
            viewAllHref="/dashboard/dispatch"
          />

          <OperationalPanel
            title="Upcoming Jobs"
            description="Next assigned future journeys"
            count={dispatch.summary.upcomingCount}
            icon={<Clock3 size={18} />}
            emptyText="No upcoming assigned bookings."
            items={upcomingBookings}
            viewAllHref="/dashboard/dispatch"
          />
        </div>
      </section>

      {/* Driver Statistics */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="text-slate-500" />

          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Driver Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Drivers"
            value={totalDrivers}
            description="Drivers registered in the system"
            icon={<Users size={22} />}
          />

          <StatCard
            title="Available"
            value={overview.drivers.availableDrivers}
            description="Online and ready for work"
            icon={<CheckCircle2 size={22} />}
          />

          <StatCard
            title="Busy"
            value={overview.drivers.busyDrivers}
            description="Currently handling an active trip"
            icon={<Clock3 size={22} />}
          />

          <StatCard
            title="Offline"
            value={overview.drivers.offlineDrivers}
            description="Not currently working"
            icon={<CircleOff size={22} />}
          />

          <StatCard
            title="Inactive"
            value={overview.drivers.inactiveDrivers}
            description="Cannot receive assignments"
            icon={<XCircle size={22} />}
          />
        </div>
      </section>
    </div>
  );
}

function FilterControl({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:bg-white">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SearchResults({ bookings }: { bookings: Booking[] }) {
  const groupedBookings = useMemo(() => {
    const groups = new Map<string, Booking[]>();

    bookings.forEach((booking) => {
      const key = londonDateKey(booking.pickupDatetime);
      const current = groups.get(key) || [];
      current.push(booking);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({
        dateKey,
        label: formatLondonDateGroup(items[0].pickupDatetime),
        bookings: items.sort(
          (a, b) =>
            new Date(a.pickupDatetime).getTime() -
            new Date(b.pickupDatetime).getTime(),
        ),
      }));
  }, [bookings]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Search Results</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"} matched
          </p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <Search size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            No bookings match these filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4 bg-slate-100 p-3">
          {groupedBookings.map((group) => (
            <div
              key={group.dateKey}
              className="overflow-hidden rounded-xl border border-slate-300 bg-white"
            >
              <div className="flex items-center justify-between bg-slate-950 px-4 py-2 text-white">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-slate-300" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                    {group.label}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-300">
                  {group.bookings.length} job{group.bookings.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] table-fixed">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-[11%] px-3 py-2">Job</th>
                      <th className="w-[8%] px-3 py-2">Time</th>
                      <th className="w-[14%] px-3 py-2">Passenger / Client</th>
                      <th className="w-[26%] px-3 py-2">Journey</th>
                      <th className="w-[17%] px-3 py-2">Driver</th>
                      <th className="w-[10%] px-3 py-2">Vehicle</th>
                      <th className="w-[7%] px-3 py-2">Payment</th>
                      <th className="w-[5%] px-3 py-2">Status</th>
                      <th className="w-[2%] px-2 py-2" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/70">
                    {group.bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className={`align-top transition hover:brightness-[0.98] ${getSearchResultRowClass(
                          booking.status,
                        )}`}
                      >
                        <td className="border-r border-black/5 px-3 py-2.5">
                          <p className="truncate text-[11px] font-black text-slate-950">
                            {booking.bookingReference}
                          </p>
                          <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                            {formatStatus(booking.journeyType || "Booking")}
                          </p>
                        </td>

                        <td className="border-r border-black/5 px-3 py-2.5">
                          <p className="text-sm font-black tabular-nums text-slate-950">
                            {formatLondonTime(booking.pickupDatetime)}
                          </p>
                          <p className="mt-0.5 text-[9px] font-semibold text-slate-600">
                            {formatLondonDate(booking.pickupDatetime)}
                          </p>
                        </td>

                        <td className="border-r border-black/5 px-3 py-2.5">
                          <p className="truncate text-[11px] font-bold text-slate-950">
                            {booking.customerName}
                          </p>
                          <p className="mt-1 truncate text-[9px] text-slate-600">
                            {booking.account?.name || "No client account"}
                          </p>
                        </td>

                        <td className="border-r border-black/5 px-3 py-2.5">
                          <div className="space-y-1">
                            <p
                              className="truncate text-[10px] font-semibold text-slate-900"
                              title={booking.pickupAddress}
                            >
                              <span className="mr-1 text-slate-500">P/U</span>
                              {booking.pickupAddress}
                            </p>
                            <p
                              className="truncate text-[10px] font-medium text-slate-700"
                              title={booking.dropoffAddress}
                            >
                              <span className="mr-1 text-slate-500">D/O</span>
                              {booking.dropoffAddress}
                            </p>
                          </div>
                        </td>

                        <td className="border-r border-black/5 px-3 py-2.5">
                          {booking.assignedDriver ? (
                            <div className="min-w-0">
                              <div className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-950 px-2 py-1 text-white shadow-sm">
                                <UserRound size={11} className="shrink-0" />
                                <span className="truncate text-[10px] font-black uppercase tracking-wide">
                                  {booking.assignedDriver.name}
                                </span>
                              </div>
                              {booking.assignedDriver.phone && (
                                <p className="mt-1 truncate text-[9px] font-medium text-slate-600">
                                  {booking.assignedDriver.phone}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex rounded-md border border-slate-400 bg-white/70 px-2 py-1 text-[9px] font-black uppercase text-slate-600">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="border-r border-black/5 px-3 py-2.5">
                          {booking.assignedDriver ? (
                            <>
                              <p className="truncate text-[10px] font-bold text-slate-900">
                                {booking.assignedDriver.vehicleName || "Vehicle not set"}
                              </p>
                              <p className="mt-1 truncate text-[9px] font-semibold text-slate-600">
                                {booking.assignedDriver.vehicleNumber || "—"}
                              </p>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-500">—</span>
                          )}
                        </td>

                        <td className="border-r border-black/5 px-3 py-2.5">
                          <span className="text-[10px] font-bold text-slate-800">
                            {booking.finance?.paymentType
                              ? formatStatus(booking.finance.paymentType)
                              : "—"}
                          </span>
                        </td>

                        <td className="border-r border-black/5 px-2 py-2.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[8px] font-black ${getBookingStatusClass(
                              booking.status,
                            )}`}
                          >
                            {getBookingStatusLabel(booking.status)}
                          </span>
                        </td>

                        <td className="px-2 py-2.5 text-right">
                          <Link
                            href={`/dashboard/bookings/${booking.id}/edit`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-950"
                            title="Open booking"
                          >
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getSearchResultRowClass(status: BookingStatus) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100";
    case "STARTED":
      return "bg-yellow-100";
    case "ARRIVED":
      return "bg-purple-100";
    case "ACCEPTED":
      return "bg-red-100";
    case "PENDING":
    case "ASSIGNED":
      return "bg-slate-200";
    case "CANCELLED":
    case "REJECTED":
      return "bg-slate-100 opacity-80";
    default:
      return "bg-white";
  }
}

function formatLondonDateGroup(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
        </div>

        <ArrowRight
          size={16}
          className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
        />
      </div>
    </Link>
  );
}

function OperationalPanel({
  title,
  description,
  count,
  icon,
  emptyText,
  items,
  viewAllHref,
}: {
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  emptyText: string;
  items: Booking[];
  viewAllHref: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">{title}</h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {count}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <Link
          href={viewAllHref}
          className="shrink-0 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
        >
          View all
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((booking) => (
          <div key={booking.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/dashboard/bookings"
                    className="font-semibold text-slate-800 hover:text-slate-950"
                  >
                    {booking.bookingReference}
                  </Link>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getBookingStatusClass(
                      booking.status,
                    )}`}
                  >
                    {getBookingStatusLabel(booking.status)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-600">
                  {booking.customerName}
                </p>

                <p className="mt-2 line-clamp-1 text-xs text-slate-400">
                  {booking.pickupAddress}
                </p>

                {booking.assignedDriver && (
                  <p className="mt-1 text-xs text-slate-500">
                    Driver: {booking.assignedDriver.name}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-slate-600">
                  {formatLondonDate(booking.pickupDatetime)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatLondonTime(booking.pickupDatetime)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              {emptyText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLondonDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
  });
}

function formatLondonDateFull(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLondonTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function londonDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}
