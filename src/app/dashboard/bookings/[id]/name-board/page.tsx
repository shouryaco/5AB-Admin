"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Printer, RotateCcw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";

type Passenger = {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
};

type BookingDetail = {
  id: string;
  bookingReference: string;
  customerName: string;
  nameCardOverride: string | null;
  passengersList: Array<{
    id: string;
    passengerId: string;
    isPrimary: boolean;
    position: number;
    passenger: Passenger;
  }>;
};

export default function NameBoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [boardName, setBoardName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setError("Booking ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<BookingDetail>(`/bookings/${bookingId}`);
      const loadedBooking = response.data;

      const primaryRelation =
        loadedBooking.passengersList?.find((item) => item.isPrimary) ||
        [...(loadedBooking.passengersList || [])].sort(
          (a, b) => a.position - b.position,
        )[0];

      const primaryPassengerName = primaryRelation?.passenger?.name?.trim() || "";
      const displayName =
        loadedBooking.nameCardOverride?.trim() ||
        primaryPassengerName ||
        loadedBooking.customerName?.trim() ||
        "Passenger";

      setBooking(loadedBooking);
      setBoardName(displayName);
    } catch (err: unknown) {
      console.error("Unable to load name board booking:", err);

      const requestError = err as {
        response?: { data?: { message?: string | string[] } };
      };

      const message = requestError.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to load booking for the name board.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const passengerName = useMemo(() => {
    if (!booking) return "";

    const primaryRelation =
      booking.passengersList?.find((item) => item.isPrimary) ||
      [...(booking.passengersList || [])].sort(
        (a, b) => a.position - b.position,
      )[0];

    return (
      primaryRelation?.passenger?.name?.trim() ||
      booking.customerName?.trim() ||
      "Passenger"
    );
  }, [booking]);

  function resetToPassengerName() {
    setBoardName(passengerName);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-500">Loading name board...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-red-700">{error || "Booking not found."}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .name-board-controls {
            display: none !important;
          }

          .name-board-shell {
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="name-board-controls mx-auto mb-4 flex w-full max-w-[1120px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              title="Back"
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Name Board
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {booking.bookingReference}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
              placeholder="Passenger name"
            />

            <button
              type="button"
              onClick={resetToPassengerName}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              Use Passenger Name
            </button>
          </div>

          {booking.nameCardOverride?.trim() && (
            <p className="mt-2 text-xs text-slate-400">
              Booking override: {booking.nameCardOverride}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={!boardName.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      <main className="name-board-shell mx-auto flex aspect-[297/210] w-full max-w-[1120px] flex-col overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xl">
        <div className="flex h-[38%] flex-col items-center justify-end px-12 pb-8 text-center">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black tracking-tight text-amber-400">
              5AB
            </div>

            <div className="text-left">
              <div className="text-[30px] font-semibold tracking-tight text-slate-950">
                5AB Chauffeurs
              </div>
              <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Executive Chauffeur Services
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-14 pt-10 text-center">
          <h1
            className="max-w-[92%] break-words font-black uppercase leading-[0.98] tracking-tight text-black"
            style={{ fontSize: "clamp(46px, 7vw, 96px)" }}
          >
            {boardName.trim() || passengerName}
          </h1>
        </div>

        <div className="mx-20 mb-3 h-[3px] bg-slate-950" />
      </main>
    </div>
  );
}
