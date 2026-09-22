"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

import socket from "@/lib/socket";
import api from "@/lib/api";

import {
  getBookingStatusClass,
  getBookingStatusLabel,
} from "@/lib/booking-status-ui";

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

type BookingLifecycleAction =
  | "accept"
  | "arrived"
  | "start"
  | "complete"
  | "cancel";

type DispatchFilter =
  | "ALL"
  | "NOT_ACCEPTED"
  | "ON_ROAD"
  | "ARRIVED"
  | "PASSENGER_ON_BOARD"
  | "COMPLETED";

type Driver = {
  id: string;
  name: string;
  phone: string;
  vehicleName: string | null;
  vehicleNumber: string | null;
  status: DriverStatus;
};

type Booking = {
  id: string;
  bookingReference: string;

  customerName: string;
  customerPhone?: string;
  customerEmail?: string | null;

  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;

  passengers: number | string | null;
  luggage: number | string | null;

  journeyType?: string;
  notes?: string | null;

  status: BookingStatus;

  assignedDriverId?: string | null;

  assignedDriver?: Driver | null;

  completedAt?: string | null;
};

type DispatchSummary = {
  // Existing summary fields kept for compatibility
  unassignedCount: number;
  activeCount: number;
  upcomingCount: number;

  // New operational lane counts
  notAcceptedCount: number;
  onRoadCount: number;
  arrivedCount: number;
  passengerOnBoardCount: number;
  completedCount: number;

  // Driver counts
  availableDrivers: number;
  busyDrivers: number;
  offlineDrivers?: number;
  inactiveDrivers?: number;
};

type DispatchData = {
  summary: DispatchSummary;

  // Existing groups kept for compatibility
  unassignedBookings: Booking[];
  activeBookings: Booking[];
  upcomingBookings: Booking[];

  // New operational lanes
  notAcceptedBookings: Booking[];
  onRoadBookings: Booking[];
  arrivedBookings: Booking[];
  passengerOnBoardBookings: Booking[];
  completedBookings: Booking[];

  // Drivers
  availableDrivers: Driver[];
  busyDrivers: Driver[];
  offlineDrivers?: Driver[];
  inactiveDrivers?: Driver[];
};

const driverStatusClasses: Record<DriverStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",

  BUSY: "border-amber-200 bg-amber-50 text-amber-700",

  OFFLINE: "border-slate-200 bg-slate-100 text-slate-600",

  INACTIVE: "border-red-200 bg-red-50 text-red-700",
};

export default function DispatchPage() {
  const [data, setData] = useState<DispatchData | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState("");

  const [assigning, setAssigning] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [quickActionBookingId, setQuickActionBookingId] = useState<
    string | null
  >(null);

  const [activeFilter, setActiveFilter] = useState<DispatchFilter>("ALL");

  const [error, setError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [statusActionError, setStatusActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await api.get<Driver[]>("/drivers");

      setDrivers(response.data);
    } catch (error) {
      console.error("Failed to load drivers:", error);
    }
  }, []);

  const fetchDispatchBoard = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get<DispatchData>(
        "/admin/dashboard/dispatch-board",
      );

      setData(response.data);

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load dispatch board:", error);

      setError("Unable to load dispatch board.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDispatchBoard();
    fetchDrivers();

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
    };

    const handleDispatchUpdate = (update: unknown) => {
      console.log("Realtime update received", update);

      void Promise.all([fetchDispatchBoard(), fetchDrivers()]);
    };

    socket.on("connect", handleConnect);

    socket.on("dispatch-updated", handleDispatchUpdate);

    return () => {
      socket.off("connect", handleConnect);

      socket.off("dispatch-updated", handleDispatchUpdate);
    };
  }, [fetchDispatchBoard, fetchDrivers]);

  function openBooking(booking: Booking) {
    setSelectedBooking(booking);
    setAssignmentError("");
    setStatusActionError("");

    setSelectedDriverId(
      booking.assignedDriverId || booking.assignedDriver?.id || "",
    );
  }

  function closeBooking() {
    if (assigning || statusActionLoading) {
      return;
    }

    setSelectedBooking(null);
    setSelectedDriverId("");
    setAssignmentError("");
    setStatusActionError("");
  }

  async function assignDriver() {
    if (!selectedBooking || !selectedDriverId) {
      return;
    }

    try {
      setAssigning(true);
      setAssignmentError("");

      await api.patch(`/bookings/${selectedBooking.id}/assign-driver`, {
        driverId: selectedDriverId,
      });

      await Promise.all([fetchDispatchBoard(true), fetchDrivers()]);

      setSelectedBooking(null);
      setSelectedDriverId("");
    } catch (error: unknown) {
      console.error("Failed to assign driver:", error);

      const requestError = error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      };

      const message = requestError.response?.data?.message;

      setAssignmentError(
        Array.isArray(message)
          ? message.join(" ")
          : message || "Unable to assign driver.",
      );
    } finally {
      setAssigning(false);
    }
  }

  async function runBookingStatusAction(
    action: BookingLifecycleAction,
    bookingOverride?: Booking,
  ) {
    const booking = bookingOverride || selectedBooking;

    if (!booking) {
      return;
    }

    try {
      setStatusActionLoading(true);
      setQuickActionBookingId(booking.id);
      setStatusActionError("");
      setError("");

      await api.patch(`/bookings/${booking.id}/${action}`);

      await Promise.all([fetchDispatchBoard(true), fetchDrivers()]);

      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(null);
        setSelectedDriverId("");
      }
    } catch (error: unknown) {
      console.error("Failed to update booking status:", error);

      const requestError = error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      };

      const message = requestError.response?.data?.message;

      const errorMessage = Array.isArray(message)
        ? message.join(" ")
        : message || "Unable to update booking status.";

      setStatusActionError(errorMessage);

      if (!selectedBooking || selectedBooking.id !== booking.id) {
        setError(errorMessage);
      }
    } finally {
      setStatusActionLoading(false);
      setQuickActionBookingId(null);
    }
  }

  const assignableDrivers = useMemo(() => {
    const statusOrder: Record<DriverStatus, number> = {
      AVAILABLE: 0,
      OFFLINE: 1,
      BUSY: 2,
      INACTIVE: 3,
    };

    return drivers
      .filter((driver) => driver.status !== "INACTIVE")
      .sort(
        (a, b) =>
          statusOrder[a.status] - statusOrder[b.status] ||
          a.name.localeCompare(b.name),
      );
  }, [drivers]);

  const driverGroups = useMemo(
    () => ({
      available: drivers.filter((driver) => driver.status === "AVAILABLE"),
      busy: drivers.filter((driver) => driver.status === "BUSY"),
      offline: drivers.filter((driver) => driver.status === "OFFLINE"),
      inactive: drivers.filter((driver) => driver.status === "INACTIVE"),
    }),
    [drivers],
  );

  const filteredDispatch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filterBookings = (items: Booking[]) => {
      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.pickupDatetime).getTime() -
          new Date(b.pickupDatetime).getTime(),
      );

      if (!term) return sorted;

      return sorted.filter((booking) =>
        [
          booking.bookingReference,
          booking.customerName,
          booking.customerPhone,
          booking.pickupAddress,
          booking.dropoffAddress,
          booking.assignedDriver?.name,
          booking.assignedDriver?.vehicleName,
          booking.assignedDriver?.vehicleNumber,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      );
    };

    return {
      notAccepted: filterBookings(data?.notAcceptedBookings || []),

      onRoad: filterBookings(data?.onRoadBookings || []),

      arrived: filterBookings(data?.arrivedBookings || []),

      passengerOnBoard: filterBookings(data?.passengerOnBoardBookings || []),

      completed: filterBookings(data?.completedBookings || []),
    };
  }, [data, searchTerm]);

  const dispatchRows = useMemo(() => {
    const groups: Record<DispatchFilter, Booking[]> = {
      ALL: [
        ...filteredDispatch.notAccepted,
        ...filteredDispatch.onRoad,
        ...filteredDispatch.arrived,
        ...filteredDispatch.passengerOnBoard,
        ...filteredDispatch.completed,
      ],
      NOT_ACCEPTED: filteredDispatch.notAccepted,
      ON_ROAD: filteredDispatch.onRoad,
      ARRIVED: filteredDispatch.arrived,
      PASSENGER_ON_BOARD: filteredDispatch.passengerOnBoard,
      COMPLETED: filteredDispatch.completed,
    };

    const statusOrder: Record<BookingStatus, number> = {
      PENDING: 0,
      ASSIGNED: 0,
      ACCEPTED: 1,
      ARRIVED: 2,
      STARTED: 3,
      COMPLETED: 4,
      REJECTED: 5,
      CANCELLED: 5,
    };

    return [...groups[activeFilter]].sort((a, b) => {
      if (activeFilter === "ALL") {
        const statusDifference = statusOrder[a.status] - statusOrder[b.status];

        if (statusDifference !== 0) {
          return statusDifference;
        }
      }

      if (a.status === "COMPLETED" && b.status === "COMPLETED") {
        const aTime = new Date(a.completedAt || a.pickupDatetime).getTime();
        const bTime = new Date(b.completedAt || b.pickupDatetime).getTime();

        return bTime - aTime;
      }

      return (
        new Date(a.pickupDatetime).getTime() -
        new Date(b.pickupDatetime).getTime()
      );
    });
  }, [activeFilter, filteredDispatch]);

  function toggleDispatchFilter(filter: DispatchFilter) {
    setActiveFilter((current) => (current === filter ? "ALL" : filter));
  }

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchDispatchBoard(true), fetchDrivers()]);
  }, [fetchDispatchBoard, fetchDrivers]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-400" />

          <p className="mt-3 text-sm text-slate-500">
            Loading dispatch board...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-6 lg:p-8">
      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Dispatch Board
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Live fleet operations and driver assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/bookings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={16} />
            New Booking
          </Link>

          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary */}

      {data?.summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Not Accepted"
            value={data.summary.notAcceptedCount}
            icon={<Users size={19} />}
            active={activeFilter === "NOT_ACCEPTED"}
            onClick={() => toggleDispatchFilter("NOT_ACCEPTED")}
          />

          <SummaryCard
            label="On Road"
            value={data.summary.onRoadCount}
            icon={<Route size={19} />}
            active={activeFilter === "ON_ROAD"}
            onClick={() => toggleDispatchFilter("ON_ROAD")}
          />

          <SummaryCard
            label="Arrived / Waiting"
            value={data.summary.arrivedCount}
            icon={<MapPin size={19} />}
            active={activeFilter === "ARRIVED"}
            onClick={() => toggleDispatchFilter("ARRIVED")}
          />

          <SummaryCard
            label="Passenger On Board"
            value={data.summary.passengerOnBoardCount}
            icon={<Car size={19} />}
            active={activeFilter === "PASSENGER_ON_BOARD"}
            onClick={() => toggleDispatchFilter("PASSENGER_ON_BOARD")}
          />

          <SummaryCard
            label="Completed"
            value={data.summary.completedCount}
            icon={<CheckCircle2 size={19} />}
            active={activeFilter === "COMPLETED"}
            onClick={() => toggleDispatchFilter("COMPLETED")}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search / live status */}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search booking, passenger, address or driver..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>
            Realtime:{" "}
            <strong className="font-semibold text-emerald-600">On</strong>
          </span>
          <span>
            Last updated:{" "}
            <strong className="font-semibold text-slate-600">
              {lastUpdated ? formatTimeOnly(lastUpdated) : "—"}
            </strong>
          </span>
        </div>
      </div>

      {/* Dispatch jobs */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Dispatch Jobs
              </h2>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {dispatchRows.length}
              </span>

              {activeFilter !== "ALL" && (
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                  {getDispatchFilterLabel(activeFilter)}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              One booking per row. Use the quick action to move a job to its
              next operational stage.
            </p>
          </div>

          {activeFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Show all jobs
            </button>
          )}
        </div>

        <DispatchTable
          bookings={dispatchRows}
          quickActionBookingId={quickActionBookingId}
          onBookingClick={openBooking}
          onStatusAction={(booking, action) =>
            void runBookingStatusAction(action, booking)
          }
        />
      </section>

      {/* Driver Status */}

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Driver Status</h2>
            <p className="mt-1 text-xs text-slate-400">
              Current operational status. Offline and busy drivers may still be
              assigned to future non-conflicting work.
            </p>
          </div>

          <Link
            href="/dashboard/drivers"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Manage drivers →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DriverColumn
            title="Available"
            status="AVAILABLE"
            drivers={driverGroups.available}
          />
          <DriverColumn
            title="Busy"
            status="BUSY"
            drivers={driverGroups.busy}
          />
          <DriverColumn
            title="Offline"
            status="OFFLINE"
            drivers={driverGroups.offline}
          />
          <DriverColumn
            title="Inactive"
            status="INACTIVE"
            drivers={driverGroups.inactive}
          />
        </div>
      </section>

      {/* Booking Drawer */}

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={closeBooking}
        >
          <div
            className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}

            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dispatch Booking
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedBooking.bookingReference}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getBookingStatusClass(
                      selectedBooking.status,
                    )}`}
                  >
                    {getBookingStatusLabel(selectedBooking.status)}
                  </span>

                  {canEditBooking(selectedBooking.status) && (
                    <Link
                      href={`/dashboard/bookings/${selectedBooking.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Pencil size={12} />
                      Edit
                    </Link>
                  )}

                  <Link
                    href={`/dashboard/bookings/new?mode=return&source=${selectedBooking.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    <Route size={12} />
                    Return
                  </Link>

                  <Link
                    href={`/dashboard/bookings/new?mode=duplicate&source=${selectedBooking.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy size={12} />
                    Duplicate Booking
                  </Link>
                </div>
              </div>

              <button
                type="button"
                onClick={closeBooking}
                disabled={assigning || statusActionLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-7 p-6">
              {/* Customer */}

              <section>
                <SectionTitle>Customer</SectionTitle>

                <div className="mt-3 rounded-xl border border-slate-200 p-4">
                  <DetailRow
                    icon={<User size={15} />}
                    label="Name"
                    value={selectedBooking.customerName}
                  />

                  <DetailRow
                    icon={<Phone size={15} />}
                    label="Phone"
                    value={selectedBooking.customerPhone || "—"}
                  />
                </div>
              </section>

              {/* Journey */}

              <section>
                <SectionTitle>Journey</SectionTitle>

                <div className="mt-3 rounded-xl border border-slate-200 p-4">
                  <DetailRow
                    icon={<CalendarDays size={15} />}
                    label="Pickup"
                    value={formatDateTime(selectedBooking.pickupDatetime)}
                  />

                  <DetailRow
                    icon={<MapPin size={15} />}
                    label="Pickup Address"
                    value={selectedBooking.pickupAddress}
                  />

                  <DetailRow
                    icon={<MapPin size={15} />}
                    label="Destination"
                    value={selectedBooking.dropoffAddress}
                  />

                  <DetailRow
                    icon={<Users size={15} />}
                    label="Passengers"
                    value={String(selectedBooking.passengers ?? "—")}
                  />

                  <DetailRow
                    label="Luggage"
                    value={String(selectedBooking.luggage ?? "—")}
                  />
                </div>
              </section>

              {/* Current Driver */}

              {selectedBooking.assignedDriver && (
                <section>
                  <SectionTitle>Current Driver</SectionTitle>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {selectedBooking.assignedDriver.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {selectedBooking.assignedDriver.vehicleName ||
                            "Vehicle not set"}
                        </p>

                        {selectedBooking.assignedDriver.vehicleNumber && (
                          <p className="mt-1 text-xs text-slate-400">
                            {selectedBooking.assignedDriver.vehicleNumber}
                          </p>
                        )}
                      </div>

                      {selectedBooking.assignedDriver.status && (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            driverStatusClasses[
                              selectedBooking.assignedDriver.status
                            ]
                          }`}
                        >
                          {selectedBooking.assignedDriver.status}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Booking Status Controls */}

              <section>
                <SectionTitle>Booking Status</SectionTitle>

                <div className="mt-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {getBookingStatusLabel(selectedBooking.status)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Admin can progress the booking through the same
                        lifecycle that the Driver App will use later.
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getBookingStatusClass(
                        selectedBooking.status,
                      )}`}
                    >
                      {getBookingStatusLabel(selectedBooking.status)}
                    </span>
                  </div>

                  {statusActionError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium leading-5 text-red-700">
                      {statusActionError}
                    </div>
                  )}

                  {selectedBooking.status === "PENDING" && (
                    <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
                      Assign a driver first. Once assigned, you can mark the
                      driver as accepted.
                    </div>
                  )}

                  {selectedBooking.status === "ASSIGNED" && (
                    <button
                      type="button"
                      onClick={() => runBookingStatusAction("accept")}
                      disabled={statusActionLoading || assigning}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {statusActionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      Mark Driver Accepted / On Road
                    </button>
                  )}

                  {selectedBooking.status === "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={() => runBookingStatusAction("arrived")}
                      disabled={statusActionLoading}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {statusActionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      Mark Arrived / Waiting
                    </button>
                  )}

                  {selectedBooking.status === "ARRIVED" && (
                    <button
                      type="button"
                      onClick={() => runBookingStatusAction("start")}
                      disabled={statusActionLoading}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {statusActionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      Mark Passenger On Board
                    </button>
                  )}

                  {selectedBooking.status === "STARTED" && (
                    <button
                      type="button"
                      onClick={() => runBookingStatusAction("complete")}
                      disabled={statusActionLoading}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {statusActionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : null}
                      Mark Completed
                    </button>
                  )}

                  {["PENDING", "ASSIGNED", "ACCEPTED", "ARRIVED"].includes(
                    selectedBooking.status,
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Cancel booking ${selectedBooking.bookingReference}?`,
                        );

                        if (confirmed) {
                          void runBookingStatusAction("cancel");
                        }
                      }}
                      disabled={statusActionLoading || assigning}
                      className="mt-3 flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel Booking
                    </button>
                  )}

                  {["COMPLETED", "CANCELLED", "REJECTED"].includes(
                    selectedBooking.status,
                  ) && (
                    <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
                      This booking is in a final status. No further lifecycle
                      action is available.
                    </div>
                  )}
                </div>
              </section>

              {/* Assignment */}

              {canAssignDriver(selectedBooking.status) && (
                <section>
                  <SectionTitle>
                    {selectedBooking.assignedDriver
                      ? "Reassign Driver"
                      : "Assign Driver"}
                  </SectionTitle>

                  <div className="mt-3 rounded-xl border border-slate-200 p-4">
                    <select
                      value={selectedDriverId}
                      onChange={(event) =>
                        setSelectedDriverId(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    >
                      <option value="">Select driver</option>

                      {assignableDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                          {" — "}
                          {driver.vehicleName || "No vehicle"}
                          {" — "}
                          {driver.status}
                        </option>
                      ))}
                    </select>

                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
                      Offline and busy drivers may still receive future
                      bookings. Scheduling conflicts are checked automatically.
                      Inactive drivers are excluded.
                    </div>

                    {assignmentError && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium leading-5 text-red-700">
                        {assignmentError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={assignDriver}
                      disabled={!selectedDriverId || assigning}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {assigning ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : selectedBooking.assignedDriver ? (
                        "Reassign Driver"
                      ) : (
                        "Assign Driver"
                      )}
                    </button>
                  </div>
                </section>
              )}

              {!canAssignDriver(selectedBooking.status) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 text-slate-500" />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Assignment locked
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Driver assignment is unavailable once the journey has
                        progressed to this stage.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DispatchTable({
  bookings,
  quickActionBookingId,
  onBookingClick,
  onStatusAction,
}: {
  bookings: Booking[];
  quickActionBookingId: string | null;
  onBookingClick: (booking: Booking) => void;
  onStatusAction: (booking: Booking, action: BookingLifecycleAction) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <Car size={30} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          No bookings found
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Try another status filter or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="w-[8%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Time
            </th>
            <th className="w-[10%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Booking
            </th>
            <th className="w-[12%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Passenger
            </th>
            <th className="w-[27%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Journey
            </th>
            <th className="w-[14%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Driver
            </th>
            <th className="w-[7%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Pax / Bag
            </th>
            <th className="w-[10%] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              Status
            </th>
            <th className="w-[12%] px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {bookings.map((booking) => {
            const quickAction = getQuickAction(booking.status);
            const actionLoading = quickActionBookingId === booking.id;

            return (
              <tr
                key={booking.id}
                className={`border-b border-slate-100 align-middle transition last:border-b-0 hover:brightness-[0.99] ${getDispatchRowBackground(
                  booking.status,
                )}`}
              >
                <td
                  className={`border-l-4 px-3 py-3 ${getDispatchAccentClass(
                    booking.status,
                  )}`}
                >
                  <p className="text-sm font-bold leading-none text-slate-900">
                    {formatPickupTime(booking.pickupDatetime)}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                    {formatPickupDate(booking.pickupDatetime)}
                  </p>
                </td>

                <td className="px-3 py-3">
                  <p className="break-words text-xs font-bold leading-4 text-slate-900">
                    {booking.bookingReference}
                  </p>
                </td>

                <td className="px-3 py-3">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {booking.customerName}
                  </p>
                  {booking.customerPhone && (
                    <p className="mt-1 truncate text-[10px] text-slate-500">
                      {booking.customerPhone}
                    </p>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-700">
                      <MapPin size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">{booking.pickupAddress}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
                      <Route size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">{booking.dropoffAddress}</span>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3">
                  {booking.assignedDriver ? (
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {booking.assignedDriver.name}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        {booking.assignedDriver.vehicleNumber ||
                          booking.assignedDriver.vehicleName ||
                          "Vehicle not set"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      Unassigned
                    </span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="text-[10px] font-medium leading-5 text-slate-600">
                    <div>{booking.passengers ?? "—"} pax</div>
                    <div>{booking.luggage ?? "—"} bag</div>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <span
                    className={`inline-flex max-w-full rounded-full border px-2 py-1 text-[9px] font-bold leading-3 ${getBookingStatusClass(
                      booking.status,
                    )}`}
                  >
                    {getCompactStatusLabel(booking.status)}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {booking.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => onBookingClick(booking)}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-slate-900 px-2.5 text-[10px] font-bold text-white transition hover:bg-slate-800"
                      >
                        Assign
                      </button>
                    )}

                    {quickAction && (
                      <button
                        type="button"
                        onClick={() => {
                          if (quickAction.action === "complete") {
                            const confirmed = window.confirm(
                              `Mark ${booking.bookingReference} as completed?`,
                            );

                            if (!confirmed) {
                              return;
                            }
                          }

                          onStatusAction(booking, quickAction.action);
                        }}
                        disabled={actionLoading}
                        className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${quickAction.className}`}
                      >
                        {actionLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        {quickAction.label}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onBookingClick(booking)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-white hover:text-slate-900"
                      title="View booking"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getQuickAction(status: BookingStatus): {
  label: string;
  action: BookingLifecycleAction;
  className: string;
} | null {
  switch (status) {
    case "ASSIGNED":
      return {
        label: "On Road",
        action: "accept",
        className: "bg-red-600 text-white hover:bg-red-700",
      };

    case "ACCEPTED":
      return {
        label: "Arrived",
        action: "arrived",
        className: "bg-purple-600 text-white hover:bg-purple-700",
      };

    case "ARRIVED":
      return {
        label: "Passenger",
        action: "start",
        className: "bg-yellow-500 text-slate-950 hover:bg-yellow-600",
      };

    case "STARTED":
      return {
        label: "Complete",
        action: "complete",
        className: "bg-green-600 text-white hover:bg-green-700",
      };

    default:
      return null;
  }
}

function getCompactStatusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ASSIGNED":
      return "Not Accepted";
    case "ACCEPTED":
      return "On Road";
    case "ARRIVED":
      return "Arrived";
    case "STARTED":
      return "Passenger On Board";
    case "COMPLETED":
      return "Completed";
    default:
      return getBookingStatusLabel(status);
  }
}

function getDispatchRowBackground(status: BookingStatus) {
  switch (status) {
    case "PENDING":
    case "ASSIGNED":
      return "bg-slate-50/70";
    case "ACCEPTED":
      return "bg-red-50/70";
    case "ARRIVED":
      return "bg-purple-50/70";
    case "STARTED":
      return "bg-yellow-50/80";
    case "COMPLETED":
      return "bg-green-50/70";
    default:
      return "bg-white";
  }
}

function getDispatchAccentClass(status: BookingStatus) {
  switch (status) {
    case "PENDING":
    case "ASSIGNED":
      return "border-l-slate-400";
    case "ACCEPTED":
      return "border-l-red-500";
    case "ARRIVED":
      return "border-l-purple-500";
    case "STARTED":
      return "border-l-yellow-500";
    case "COMPLETED":
      return "border-l-green-500";
    default:
      return "border-l-slate-300";
  }
}

function getDispatchFilterLabel(filter: DispatchFilter) {
  switch (filter) {
    case "NOT_ACCEPTED":
      return "Not Accepted";
    case "ON_ROAD":
      return "On Road";
    case "ARRIVED":
      return "Arrived / Waiting";
    case "PASSENGER_ON_BOARD":
      return "Passenger On Board";
    case "COMPLETED":
      return "Completed";
    default:
      return "All Jobs";
  }
}

function DriverColumn({
  title,
  status,
  drivers,
}: {
  title: string;
  status: DriverStatus;
  drivers: Driver[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "AVAILABLE"
                ? "bg-emerald-500"
                : status === "BUSY"
                  ? "bg-amber-500"
                  : status === "OFFLINE"
                    ? "bg-slate-400"
                    : "bg-red-500"
            }`}
          />
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {drivers.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {drivers
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((driver) => (
            <div
              key={driver.id}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {driver.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {driver.vehicleName || "Vehicle not set"}
                  </p>
                  {driver.vehicleNumber && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {driver.vehicleNumber}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${driverStatusClasses[driver.status]}`}
                >
                  {formatStatus(driver.status)}
                </span>
              </div>
            </div>
          ))}

        {drivers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
            No drivers
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-slate-500 ring-2 ring-slate-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h3>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 first:pt-0 last:border-0 last:pb-0">
      {icon && <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>}

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>

        <p className="mt-1 break-words text-sm font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatPickupTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatPickupDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
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
  });
}

function formatTimeOnly(value: Date) {
  return value.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function canAssignDriver(status: BookingStatus) {
  return ["PENDING", "ASSIGNED"].includes(status);
}

function canEditBooking(status: BookingStatus) {
  return !["COMPLETED", "CANCELLED", "REJECTED"].includes(status);
}
