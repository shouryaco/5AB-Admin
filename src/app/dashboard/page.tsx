"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleOff,
  Clock3,
  Gauge,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  Route,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import socket from "@/lib/socket";

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
};

type DispatchBooking = {
  id: string;
  bookingReference: string;

  customerName: string;
  customerPhone?: string | null;

  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;

  passengers: number | string | null;
  luggage: number | string | null;

  status: BookingStatus;

  assignedDriverId?: string | null;
  assignedDriver?: Driver | null;
};

type DispatchData = {
  summary: {
    unassignedCount: number;
    activeCount: number;
    upcomingCount: number;
    availableDrivers: number;
    busyDrivers: number;
    offlineDrivers?: number;
    inactiveDrivers?: number;
  };

  unassignedBookings: DispatchBooking[];
  activeBookings: DispatchBooking[];
  upcomingBookings: DispatchBooking[];

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
  href?: string;
};

const statusClasses: Record<BookingStatus, string> = {
  PENDING: "border-red-200 bg-red-50 text-red-700",
  ASSIGNED: "border-violet-200 bg-violet-50 text-violet-700",
  ACCEPTED: "border-cyan-200 bg-cyan-50 text-cyan-700",
  ARRIVED: "border-amber-200 bg-amber-50 text-amber-700",
  STARTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
};

function StatCard({ title, value, description, icon, href }: StatCardProps) {
  const body = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

      {href && (
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-500">
          View details
          <ArrowRight size={13} />
        </div>
      )}
    </div>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [dispatch, setDispatch] = useState<DispatchData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /*
   * Prevent duplicate dashboard loads.
   *
   * In development React Strict Mode can run effects twice, and realtime
   * dispatch events can arrive while a dashboard request is already running.
   * Without a lock that can create overlapping calls to the relatively heavy
   * dispatch endpoint.
   */
  const requestInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (requestInFlightRef.current) {
      if (isRefresh) {
        refreshQueuedRef.current = true;
      }

      return;
    }

    requestInFlightRef.current = true;

    try {
      if (mountedRef.current) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
      }

      /*
       * Intentionally sequential.
       * Both backend endpoints perform their own database work, so there is no
       * benefit in making the browser create another layer of concurrency.
       */
      const overviewResponse = await api.get<DashboardOverview>(
        "/admin/dashboard/overview",
      );

      const dispatchResponse = await api.get<DispatchData>(
        "/admin/dashboard/dispatch-board",
      );

      if (!mountedRef.current) {
        return;
      }

      setOverview(overviewResponse.data);
      setDispatch(dispatchResponse.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!mountedRef.current) {
        return;
      }

      const status = err?.response?.status;
      const responseMessage = err?.response?.data?.message;

      console.error("Dashboard request failed", {
        status,
        url: err?.config?.url,
        message: Array.isArray(responseMessage)
          ? responseMessage.join(", ")
          : responseMessage || err?.message || "Unknown request error",
      });

      setError(
        Array.isArray(responseMessage)
          ? responseMessage.join(", ")
          : responseMessage || "Unable to load dashboard information.",
      );
    } finally {
      requestInFlightRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }

      /*
       * If a realtime event arrived while a request was running, perform one
       * follow-up refresh. Multiple events collapse into this single refresh.
       */
      if (mountedRef.current && refreshQueuedRef.current) {
        refreshQueuedRef.current = false;

        window.setTimeout(() => {
          if (mountedRef.current) {
            fetchDashboard(true);
          }
        }, 250);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    fetchDashboard();

    const handleDispatchUpdate = () => {
      fetchDashboard(true);
    };

    socket.on("dispatch-updated", handleDispatchUpdate);

    return () => {
      mountedRef.current = false;
      socket.off("dispatch-updated", handleDispatchUpdate);
    };
  }, [fetchDashboard]);

  const totalDrivers = useMemo(() => {
    if (!overview) return 0;

    return (
      overview.drivers.availableDrivers +
      overview.drivers.busyDrivers +
      overview.drivers.offlineDrivers +
      overview.drivers.inactiveDrivers
    );
  }, [overview]);

  const operationalBookings = useMemo(() => {
    if (!dispatch) return [];

    const combined = [
      ...dispatch.unassignedBookings,
      ...dispatch.activeBookings,
      ...dispatch.upcomingBookings,
    ];

    const unique = new Map<string, DispatchBooking>();

    combined.forEach((booking) => {
      unique.set(booking.id, booking);
    });

    return [...unique.values()]
      .sort(
        (a, b) =>
          new Date(a.pickupDatetime).getTime() -
          new Date(b.pickupDatetime).getTime(),
      )
      .slice(0, 6);
  }, [dispatch]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 rounded bg-slate-100" />

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl bg-slate-200" />
            ))}
          </div>

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
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-400">
            <LayoutDashboard size={17} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Operations
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Live overview of bookings, journeys and driver availability.
          </p>

          {lastUpdated && (
            <p className="mt-2 text-xs text-slate-400">
              Last updated {formatTime(lastUpdated)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/bookings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={16} />
            New Booking
          </Link>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Gauge size={18} className="text-slate-500" />

          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            href="/dashboard/bookings/new"
            title="New Booking"
            description="Create and allocate a chauffeur booking."
            icon={<Plus size={19} />}
          />

          <QuickAction
            href="/dashboard/dispatch"
            title="Dispatch Board"
            description="Assign drivers and monitor live operations."
            icon={<Route size={19} />}
          />

          <QuickAction
            href="/dashboard/drivers"
            title="Drivers"
            description="Manage drivers, vehicles and documents."
            icon={<Car size={19} />}
          />

          <QuickAction
            href="/dashboard/clients"
            title="Clients"
            description="Manage accounts, bookers and passengers."
            icon={<Users size={19} />}
          />
        </div>
      </section>

      {/* Live Operations */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Route size={18} className="text-slate-500" />

            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Live Operations
            </h2>
          </div>

          <Link
            href="/dashboard/dispatch"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Open Dispatch
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalCard
            label="Unassigned"
            value={dispatch.summary.unassignedCount}
            description="Bookings waiting for a driver"
            icon={<Users size={19} />}
          />

          <OperationalCard
            label="Upcoming"
            value={dispatch.summary.upcomingCount}
            description="Assigned future bookings"
            icon={<CalendarDays size={19} />}
          />

          <OperationalCard
            label="Active Trips"
            value={dispatch.summary.activeCount}
            description="Accepted or in-progress journeys"
            icon={<Route size={19} />}
          />

          <OperationalCard
            label="Available Drivers"
            value={dispatch.summary.availableDrivers}
            description="Currently available for work"
            icon={<CheckCircle2 size={19} />}
          />
        </div>
      </section>

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
            description="All bookings in the system"
            icon={<CalendarDays size={22} />}
            href="/dashboard/bookings"
          />

          <StatCard
            title="Active Trips"
            value={overview.activeTrips}
            description="Accepted or currently in progress"
            icon={<Car size={22} />}
            href="/dashboard/dispatch"
          />

          <StatCard
            title="Completed Trips"
            value={overview.completedTrips}
            description="Successfully completed journeys"
            icon={<CheckCircle2 size={22} />}
            href="/dashboard/bookings"
          />

          <StatCard
            title="Cancelled Trips"
            value={overview.cancelledTrips}
            description="Bookings that were cancelled"
            icon={<XCircle size={22} />}
            href="/dashboard/bookings"
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
            href="/dashboard/drivers"
          />

          <StatCard
            title="Available"
            value={overview.drivers.availableDrivers}
            description="Available for work now"
            icon={<CheckCircle2 size={22} />}
            href="/dashboard/drivers"
          />

          <StatCard
            title="Busy"
            value={overview.drivers.busyDrivers}
            description="Currently handling a journey"
            icon={<Clock3 size={22} />}
            href="/dashboard/drivers"
          />

          <StatCard
            title="Offline"
            value={overview.drivers.offlineDrivers}
            description="Not currently online"
            icon={<CircleOff size={22} />}
            href="/dashboard/drivers"
          />

          <StatCard
            title="Inactive"
            value={overview.drivers.inactiveDrivers}
            description="Cannot receive assignments"
            icon={<XCircle size={22} />}
            href="/dashboard/drivers"
          />
        </div>
      </section>

      {/* Operational Queue */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Operational Queue</h2>
            <p className="mt-1 text-xs text-slate-500">
              Nearest unassigned, active and upcoming bookings.
            </p>
          </div>

          <Link
            href="/dashboard/dispatch"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            View Dispatch
            <ArrowRight size={13} />
          </Link>
        </div>

        {operationalBookings.length ? (
          <div className="divide-y divide-slate-100">
            {operationalBookings.map((booking) => (
              <Link
                key={booking.id}
                href="/dashboard/dispatch"
                className="grid grid-cols-1 gap-4 px-5 py-4 transition hover:bg-slate-50/70 lg:grid-cols-[1.1fr_1.2fr_1.6fr_1fr_auto] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {booking.bookingReference}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {booking.customerName}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">Pickup</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDateTime(booking.pickupDatetime)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-600">
                    {booking.pickupAddress}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    → {booking.dropoffAddress}
                  </p>
                </div>

                <div>
                  {booking.assignedDriver ? (
                    <>
                      <p className="text-sm font-semibold text-slate-700">
                        {booking.assignedDriver.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {booking.assignedDriver.vehicleNumber ||
                          booking.assignedDriver.vehicleName ||
                          "Vehicle not set"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-red-600">
                      Unassigned
                    </p>
                  )}
                </div>

                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                    statusClasses[booking.status]
                  }`}
                >
                  {formatStatus(booking.status)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              No operational bookings right now
            </p>
          </div>
        )}
      </section>

      {/* Driver Snapshot */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DriverSnapshot
          title="Available Drivers"
          description="Ready now or available for future non-conflicting work."
          drivers={dispatch.availableDrivers || []}
          emptyLabel="No available drivers."
        />

        <DriverSnapshot
          title="Busy Drivers"
          description="Currently handling active trips."
          drivers={dispatch.busyDrivers || []}
          emptyLabel="No busy drivers."
        />
      </section>
    </div>
  );
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
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>

        <ArrowRight
          size={16}
          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600"
        />
      </div>

      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function OperationalCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href="/dashboard/dispatch"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function DriverSnapshot({
  title,
  description,
  drivers,
  emptyLabel,
}: {
  title: string;
  description: string;
  drivers: Driver[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <Link
          href="/dashboard/drivers"
          className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {drivers.slice(0, 5).map((driver) => (
          <Link
            key={driver.id}
            href={`/dashboard/drivers/${driver.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:bg-slate-50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <UserRound size={16} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {driver.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {driver.vehicleNumber ||
                    driver.vehicleName ||
                    "Vehicle not set"}
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                driver.status === "AVAILABLE"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : driver.status === "BUSY"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : driver.status === "OFFLINE"
                      ? "border-slate-200 bg-slate-100 text-slate-600"
                      : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {driver.status}
            </span>
          </Link>
        ))}

        {drivers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
