"use client";

import { useEffect, useState } from "react";
import socket from "@/lib/socket";

import api from "@/lib/api";

type Booking = {
  id: string;
  bookingReference: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  passengers: number;
  luggage: number;
  status: string;

  assignedDriver?: {
    name: string;
  };
};

type DispatchData = {
  unassignedBookings: Booking[];
  activeBookings: Booking[];
  upcomingBookings: Booking[];
};

export default function DispatchPage() {
  const [data, setData] = useState<DispatchData | null>(null);

  const [loading, setLoading] = useState(true);

  async function fetchDispatchBoard() {
    try {
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDispatchBoard();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("dispatch-updated", (data) => {
      console.log("Realtime update received", data);

      fetchDispatchBoard();
    });

    return () => {
      socket.off("dispatch-updated");
    };
  }, []);

  if (loading) {
    return <div className="text-xl">Loading dispatch board...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Dispatch Board</h1>

        <p className="text-gray-500 mt-2">Live fleet operations</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <DispatchColumn
          title="Unassigned"
          color="bg-red-500"
          bookings={data?.unassignedBookings || []}
        />

        <DispatchColumn
          title="Active Trips"
          color="bg-green-500"
          bookings={data?.activeBookings || []}
        />

        <DispatchColumn
          title="Upcoming"
          color="bg-orange-500"
          bookings={data?.upcomingBookings || []}
        />
      </div>
    </div>
  );
}

function DispatchColumn({
  title,
  color,
  bookings,
}: {
  title: string;
  color: string;
  bookings: Booking[];
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-4 h-4 rounded-full ${color}`} />

        <h2 className="text-2xl font-bold">{title}</h2>

        <span className="ml-auto bg-gray-100 px-3 py-1 rounded-full text-sm">
          {bookings.length}
        </span>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="border rounded-2xl p-4 hover:shadow-md transition bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{booking.bookingReference}</h3>

        <span className="text-sm bg-black text-white px-3 py-1 rounded-full">
          {booking.status}
        </span>
      </div>

      <p className="mt-2 font-medium">{booking.customerName}</p>

      <div className="mt-4 text-sm text-gray-600 space-y-2">
        <p>📍 {booking.pickupAddress}</p>

        <p>➜ {booking.dropoffAddress}</p>

        <p>🕒 {new Date(booking.pickupDatetime).toLocaleString()}</p>

        <p>👥 {booking.passengers} passengers</p>

        <p>🧳 {booking.luggage} luggage</p>

        {booking.assignedDriver && (
          <p className="font-semibold text-black">
            🚗 {booking.assignedDriver.name}
          </p>
        )}
      </div>
    </div>
  );
}
