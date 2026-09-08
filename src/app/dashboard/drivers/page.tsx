"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  CircleOff,
  Eye,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldOff,
  UserCheck,
  Users,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

import api from "@/lib/api";

type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "INACTIVE";

type Driver = {
  id: string;
  name: string;
  phone: string;
  photo: string | null;
  vehicleName: string | null;
  vehicleNumber: string | null;
  status: DriverStatus;
  latitude: number | null;
  longitude: number | null;
  lastLocationUpdate: string | null;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const statusClasses: Record<DriverStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BUSY: "bg-amber-50 text-amber-700 border-amber-200",
  OFFLINE: "bg-slate-100 text-slate-600 border-slate-200",
  INACTIVE: "bg-red-50 text-red-700 border-red-200",
};

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "ALL">("ALL");

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDrivers = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get<Driver[]>("/drivers");

      setDrivers(response.data);
    } catch (err) {
      console.error("Failed to load drivers:", err);

      setError("Unable to load drivers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return drivers.filter((driver) => {
      const matchesSearch =
        !query ||
        driver.name.toLowerCase().includes(query) ||
        driver.phone.toLowerCase().includes(query) ||
        driver.vehicleName?.toLowerCase().includes(query) ||
        driver.vehicleNumber?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || driver.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [drivers, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: drivers.length,

      available: drivers.filter((driver) => driver.status === "AVAILABLE")
        .length,

      busy: drivers.filter((driver) => driver.status === "BUSY").length,

      offline: drivers.filter((driver) => driver.status === "OFFLINE").length,

      inactive: drivers.filter((driver) => driver.status === "INACTIVE").length,
    };
  }, [drivers]);

  async function changeDriverStatus(
    driver: Driver,
    action: "online" | "offline" | "inactive",
  ) {
    try {
      setActionLoading(driver.id);

      await api.patch(`/drivers/${driver.id}/${action}`);

      await fetchDrivers();

      if (selectedDriver?.id === driver.id) {
        const response = await api.get<Driver[]>("/drivers");

        const updatedDriver = response.data.find(
          (item) => item.id === driver.id,
        );

        if (updatedDriver) {
          setSelectedDriver(updatedDriver);
        }
      }
    } catch (err) {
      console.error("Failed to update driver status:", err);

      alert("Unable to update driver status.");
    } finally {
      setActionLoading(null);
    }
  }

  function formatLastSeen(date: string | null) {
    if (!date) {
      return "No location update";
    }

    return new Date(date).toLocaleString();
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-44 rounded bg-slate-200" />

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-slate-200" />
            ))}
          </div>

          <div className="mt-6 h-96 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Drivers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage drivers, vehicles and operational status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchDrivers(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/drivers/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={16} />
            Add Driver
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Drivers"
          value={counts.total}
          icon={<Users size={20} />}
        />

        <SummaryCard
          label="Available"
          value={counts.available}
          icon={<UserCheck size={20} />}
        />

        <SummaryCard
          label="Busy"
          value={counts.busy}
          icon={<Car size={20} />}
        />

        <SummaryCard
          label="Offline"
          value={counts.offline}
          icon={<CircleOff size={20} />}
        />

        <SummaryCard
          label="Inactive"
          value={counts.inactive}
          icon={<ShieldOff size={20} />}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search driver, phone or vehicle..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as DriverStatus | "ALL")
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="OFFLINE">Offline</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Driver
                </th>

                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contact
                </th>

                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Vehicle
                </th>

                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last Location
                </th>

                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredDrivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {driver.photo ? (
                        <img
                          src={driver.photo}
                          alt={driver.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="font-semibold text-slate-900">
                          {driver.name}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-400">
                          ID: {driver.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} />

                      {driver.phone}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">
                      {driver.vehicleName || "—"}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {driver.vehicleNumber || "—"}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[driver.status]}`}
                    >
                      {driver.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={15}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />

                      <div>
                        <div className="text-sm text-slate-600">
                          {driver.latitude !== null && driver.longitude !== null
                            ? `${driver.latitude.toFixed(
                                4,
                              )}, ${driver.longitude.toFixed(4)}`
                            : "No location"}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {formatLastSeen(driver.lastLocationUpdate)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick View */}
                      <button
                        type="button"
                        onClick={() => setSelectedDriver(driver)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                        title="Quick View"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Full Driver Profile */}
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/drivers/${driver.id}`)
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Full Profile
                      </button>

                      {driver.status !== "AVAILABLE" && (
                        <button
                          type="button"
                          disabled={actionLoading === driver.id}
                          onClick={() => changeDriverStatus(driver, "online")}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Available
                        </button>
                      )}

                      {driver.status !== "OFFLINE" && (
                        <button
                          type="button"
                          disabled={actionLoading === driver.id}
                          onClick={() => changeDriverStatus(driver, "offline")}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Offline
                        </button>
                      )}

                      {driver.status !== "INACTIVE" && (
                        <button
                          type="button"
                          disabled={actionLoading === driver.id}
                          onClick={() => changeDriverStatus(driver, "inactive")}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Inactive
                        </button>
                      )}

                      {actionLoading === driver.id && (
                        <Loader2
                          size={17}
                          className="my-auto animate-spin text-slate-400"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Users size={32} className="mx-auto text-slate-300" />

                    <h3 className="mt-3 font-semibold text-slate-700">
                      No drivers found
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      Try adjusting your search or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Details Drawer */}
      {selectedDriver && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setSelectedDriver(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Driver Profile
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {selectedDriver.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-7">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[selectedDriver.status]}`}
              >
                {selectedDriver.status}
              </span>
            </div>

            <div className="mt-7 space-y-5">
              <DetailItem label="Phone" value={selectedDriver.phone} />

              <DetailItem
                label="Vehicle"
                value={selectedDriver.vehicleName || "Not assigned"}
              />

              <DetailItem
                label="Registration"
                value={selectedDriver.vehicleNumber || "Not available"}
              />

              <DetailItem
                label="Latitude"
                value={
                  selectedDriver.latitude !== null
                    ? String(selectedDriver.latitude)
                    : "Not available"
                }
              />

              <DetailItem
                label="Longitude"
                value={
                  selectedDriver.longitude !== null
                    ? String(selectedDriver.longitude)
                    : "Not available"
                }
              />

              <DetailItem
                label="Last location update"
                value={formatLastSeen(selectedDriver.lastLocationUpdate)}
              />
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Driver Status
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => changeDriverStatus(selectedDriver, "online")}
                  disabled={
                    actionLoading === selectedDriver.id ||
                    selectedDriver.status === "AVAILABLE"
                  }
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 disabled:opacity-40"
                >
                  Available
                </button>

                <button
                  type="button"
                  onClick={() => changeDriverStatus(selectedDriver, "offline")}
                  disabled={
                    actionLoading === selectedDriver.id ||
                    selectedDriver.status === "OFFLINE"
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                  Offline
                </button>

                <button
                  type="button"
                  onClick={() => changeDriverStatus(selectedDriver, "inactive")}
                  disabled={
                    actionLoading === selectedDriver.id ||
                    selectedDriver.status === "INACTIVE"
                  }
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-40"
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
