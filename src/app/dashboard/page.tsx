"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  CircleOff,
  Clock3,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";

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

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
};

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>

          <p className="mt-2 text-xs text-slate-400">{description}</p>
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get<DashboardOverview>(
        "/admin/dashboard/overview",
      );

      setOverview(response.data);
    } catch (err) {
      console.error("Failed to load dashboard overview:", err);

      setError("Unable to load dashboard information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200" />

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-700">Dashboard unavailable</h2>

          <p className="mt-1 text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={() => fetchOverview()}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Overview of bookings, trips and driver availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchOverview(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Booking Statistics */}
      <div>
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
          />

          <StatCard
            title="Active Trips"
            value={overview.activeTrips}
            description="Trips currently in progress"
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
            description="Bookings that were cancelled"
            icon={<XCircle size={22} />}
          />
        </div>
      </div>

      {/* Driver Statistics */}
      <div className="mt-10">
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
            description="Ready for assignments"
            icon={<CheckCircle2 size={22} />}
          />

          <StatCard
            title="Busy"
            value={overview.drivers.busyDrivers}
            description="Currently handling a trip"
            icon={<Clock3 size={22} />}
          />

          <StatCard
            title="Offline"
            value={overview.drivers.offlineDrivers}
            description="Currently not online"
            icon={<CircleOff size={22} />}
          />

          <StatCard
            title="Inactive"
            value={overview.drivers.inactiveDrivers}
            description="Cannot receive assignments"
            icon={<XCircle size={22} />}
          />
        </div>
      </div>
    </div>
  );
}
