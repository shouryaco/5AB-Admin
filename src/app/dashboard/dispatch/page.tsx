"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  User,
  Users,
  X,
} from "lucide-react";

import socket from "@/lib/socket";
import api from "@/lib/api";

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
};

type DispatchSummary = {
  unassignedCount: number;
  activeCount: number;
  upcomingCount: number;
  availableDrivers: number;
  busyDrivers: number;
};

type DispatchData = {
  summary: DispatchSummary;

  unassignedBookings: Booking[];
  activeBookings: Booking[];
  upcomingBookings: Booking[];

  availableDrivers: Driver[];
  busyDrivers: Driver[];
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

  const [error, setError] = useState("");

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

      const response = await api.get("/admin/dashboard/dispatch-board");

      setData({
        summary: {
          ...response.data.summary,
        },

        unassignedBookings: [...response.data.unassignedBookings],

        activeBookings: [...response.data.activeBookings],

        upcomingBookings: [...response.data.upcomingBookings],

        availableDrivers: [...response.data.availableDrivers],

        busyDrivers: [...response.data.busyDrivers],
      });
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

      fetchDispatchBoard();
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

    setSelectedDriverId(
      booking.assignedDriverId || booking.assignedDriver?.id || "",
    );
  }

  function closeBooking() {
    if (assigning) {
      return;
    }

    setSelectedBooking(null);
    setSelectedDriverId("");
  }

  async function assignDriver() {
    if (!selectedBooking || !selectedDriverId) {
      return;
    }

    try {
      setAssigning(true);

      await api.patch(`/bookings/${selectedBooking.id}/assign-driver`, {
        driverId: selectedDriverId,
      });

      await Promise.all([fetchDispatchBoard(true), fetchDrivers()]);

      setSelectedBooking(null);
      setSelectedDriverId("");
    } catch (error: any) {
      console.error("Failed to assign driver:", error);

      const message = error?.response?.data?.message;

      alert(
        Array.isArray(message)
          ? message.join("\n")
          : message || "Unable to assign driver.",
      );
    } finally {
      setAssigning(false);
    }
  }

  const assignableDrivers = useMemo(() => {
    return drivers.filter((driver) => driver.status !== "INACTIVE");
  }, [drivers]);

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

        <button
          type="button"
          onClick={() => fetchDispatchBoard(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary */}

      {data?.summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Unassigned"
            value={data.summary.unassignedCount}
            icon={<Users size={19} />}
          />

          <SummaryCard
            label="Active Trips"
            value={data.summary.activeCount}
            icon={<Route size={19} />}
          />

          <SummaryCard
            label="Upcoming"
            value={data.summary.upcomingCount}
            icon={<CalendarDays size={19} />}
          />

          <SummaryCard
            label="Available Drivers"
            value={data.summary.availableDrivers}
            icon={<Car size={19} />}
          />

          <SummaryCard
            label="Busy Drivers"
            value={data.summary.busyDrivers}
            icon={<Clock3 size={19} />}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Board */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <DispatchColumn
          title="Unassigned"
          description="Waiting for driver assignment"
          dotClass="bg-red-500"
          bookings={data?.unassignedBookings || []}
          onBookingClick={openBooking}
        />

        <DispatchColumn
          title="Active Trips"
          description="Accepted and in-progress journeys"
          dotClass="bg-emerald-500"
          bookings={data?.activeBookings || []}
          onBookingClick={openBooking}
        />

        <DispatchColumn
          title="Upcoming"
          description="Assigned future bookings"
          dotClass="bg-amber-500"
          bookings={data?.upcomingBookings || []}
          onBookingClick={openBooking}
        />
      </div>

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

                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    statusClasses[selectedBooking.status]
                  }`}
                >
                  {selectedBooking.status}
                </span>
              </div>

              <button
                type="button"
                onClick={closeBooking}
                disabled={assigning}
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

function DispatchColumn({
  title,
  description,
  dotClass,
  bookings,
  onBookingClick,
}: {
  title: string;
  description: string;
  dotClass: string;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
}) {
  return (
    <div className="min-h-[580px] rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${dotClass}`} />

          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <span className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            {bookings.length}
          </span>
        </div>

        <p className="ml-6 mt-1 text-xs text-slate-400">{description}</p>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onClick={() => onBookingClick(booking)}
          />
        ))}

        {bookings.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center">
            <Car size={28} className="mx-auto text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-500">
              No bookings
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onClick,
}: {
  booking: Booking;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{booking.bookingReference}</p>

          <p className="mt-1 text-sm font-medium text-slate-600">
            {booking.customerName}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
            statusClasses[booking.status]
          }`}
        >
          {booking.status}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <CardInfo icon={<MapPin size={14} />} value={booking.pickupAddress} />

        <CardInfo icon={<Route size={14} />} value={booking.dropoffAddress} />

        <CardInfo
          icon={<Clock3 size={14} />}
          value={formatDateTime(booking.pickupDatetime)}
        />

        <div className="flex gap-4 text-xs text-slate-500">
          <span>{booking.passengers ?? "—"} passengers</span>

          <span>{booking.luggage ?? "—"} luggage</span>
        </div>

        {booking.assignedDriver && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <Car size={14} className="text-slate-500" />

            <div>
              <p className="text-xs font-semibold text-slate-700">
                {booking.assignedDriver.name}
              </p>

              {booking.assignedDriver.vehicleNumber && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {booking.assignedDriver.vehicleNumber}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <Eye size={14} />

        {booking.status === "PENDING" ? "View & Assign" : "View Booking"}
      </button>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
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

function CardInfo({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>

      <span className="line-clamp-2">{value}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canAssignDriver(status: BookingStatus) {
  return ["PENDING", "ASSIGNED"].includes(status);
}
