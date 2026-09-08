"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
  X,
  CalendarDays,
  Clock3,
  Route,
  Car,
  NotebookText,
  UserCog,
  BadgePoundSterling,
  CreditCard,
  ReceiptText,
} from "lucide-react";

import { useRouter } from "next/navigation";

import api from "@/lib/api";

import BookingRoutePlanner from "@/components/bookings/BookingRoutePlanner";

/* =====================================================
   TYPES
===================================================== */

type Driver = {
  id: string;

  name: string;

  firstName: string | null;
  lastName: string | null;

  driverType: string | null;
  callSign: string | null;

  phone: string;

  driverGrade: string | null;

  vehicleName: string | null;
  vehicleNumber: string | null;

  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "INACTIVE";
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

type ViaStop = {
  id: string;
  address: string;
};

/* =====================================================
   PAGE
===================================================== */

export default function NewBookingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [bookers, setBookers] = useState<Booker[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [primaryBookerId, setPrimaryBookerId] = useState("");
  const [additionalBookerIds, setAdditionalBookerIds] = useState<string[]>([]);

  const [primaryPassengerId, setPrimaryPassengerId] = useState("");
  const [additionalPassengerIds, setAdditionalPassengerIds] = useState<
    string[]
  >([]);

  const [accountFields, setAccountFields] = useState({
    costCenter: "",
    invoiceRef: "",
    jobStatus: "CONFIRMED",
    salesman: "",
    nameCardOverride: "",
    nameCardFileUrl: "",
  });

  const [journeyFields, setJourneyFields] = useState({
    journeyType: "TRANSFER",

    pickupDate: "",
    pickupTime: "",

    pickupAddress: "",
    dropoffAddress: "",

    passengerCount: "1",

    bigLuggage: "0",
    smallLuggage: "0",

    babySeats: "0",
    childSeats: "0",
    boosterSeats: "0",

    estimatedDurationMinutes: "120",

    routeDistanceMeters: "",
    routeDurationSeconds: "",
  });

  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [driverLoading, setDriverLoading] = useState(false);

  const [allocationFields, setAllocationFields] = useState({
    preferredVehicleCategory: "Executive",
    requestedDriverType: "",
    assignedDriverId: "",
  });

  const [noteFields, setNoteFields] = useState({
    notes: "",
    driverNote: "",
  });

  const [vias, setVias] = useState<ViaStop[]>([]);

  const [quickBookerOpen, setQuickBookerOpen] = useState(false);
  const [quickPassengerOpen, setQuickPassengerOpen] = useState(false);

  const [clientFinance, setClientFinance] = useState({
    clientQuote: "",
    clientWaitingCharge: "",
    clientParking: "",
    clientCongestion: "",
    clientDiscount: "",
    clientTotal: "",

    clientAdminFee: "",
    clientNet: "",
    clientVat: "",
    clientVatPercent: "20",
    clientTotalAmount: "",

    clientWaitingIncluded: false,
    clientParkingIncluded: false,
    clientPriceOverride: false,

    paymentType: "ACCOUNT",
  });

  const [driverFinance, setDriverFinance] = useState({
    driverCost: "",
    driverWaitingPay: "",
    driverParking: "",
    driverCongestion: "",
    driverTotal: "",

    driverWaitingIncluded: false,
    driverParkingIncluded: false,
    driverPayAsStandard: false,
    driverPriceOverride: false,
  });

  const [financeNotes, setFinanceNotes] = useState({
    financeNote: "",
    invoiceNote: "",
    extraNote: "",
  });

  const [savingBooking, setSavingBooking] = useState(false);

  const [submitError, setSubmitError] = useState("");

  const [submitSuccess, setSubmitSuccess] = useState("");

  /* =====================================================
     LOAD ACCOUNTS
  ===================================================== */

  const loadAccounts = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get<ClientAccount[]>(
        "/clients/accounts?active=true",
      );

      setAccounts(response.data);
    } catch (err) {
      console.error("Unable to load accounts:", err);

      setError("Unable to load client accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    async function loadDrivers() {
      try {
        setDriverLoading(true);

        const response = await api.get<Driver[]>("/drivers");

        setDrivers(response.data);
      } catch (err) {
        console.error("Unable to load drivers:", err);

        setError("Unable to load drivers.");
      } finally {
        setDriverLoading(false);
      }
    }

    loadDrivers();
  }, []);

  /* =====================================================
     LOAD BOOKERS + PASSENGERS FOR ACCOUNT
  ===================================================== */

  useEffect(() => {
    async function loadPresets() {
      setBookers([]);
      setPassengers([]);

      setPrimaryBookerId("");
      setAdditionalBookerIds([]);

      setPrimaryPassengerId("");
      setAdditionalPassengerIds([]);

      if (!selectedAccountId) {
        return;
      }

      try {
        setError("");

        const [bookerResponse, passengerResponse] = await Promise.all([
          api.get<Booker[]>(`/clients/bookers?accountId=${selectedAccountId}`),

          api.get<Passenger[]>(
            `/clients/passengers?accountId=${selectedAccountId}`,
          ),
        ]);

        setBookers(bookerResponse.data);
        setPassengers(passengerResponse.data);
      } catch (err) {
        console.error("Unable to load presets:", err);

        setError(
          "Unable to load the selected account's bookers and passengers.",
        );
      }
    }

    loadPresets();
  }, [selectedAccountId]);

  /* =====================================================
     HELPERS
  ===================================================== */

  function MoneyField({
    label,
    value,
    onChange,
    emphasis = false,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    emphasis?: boolean;
  }) {
    return (
      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-500">
          {label}
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            £
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`booking-input ${
              emphasis ? "font-bold text-slate-900" : ""
            }`}
            style={{ paddingLeft: "2.5rem" }}
            placeholder="0.00"
          />
        </div>
      </div>
    );
  }

  function FinanceToggle({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) {
    return (
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
          checked
            ? "border-slate-900 bg-slate-900"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />

        <div>
          <p
            className={`text-sm font-semibold ${
              checked ? "text-white" : "text-slate-700"
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-1 text-xs leading-5 ${
              checked ? "text-slate-300" : "text-slate-400"
            }`}
          >
            {description}
          </p>
        </div>
      </label>
    );
  }

  function DriverStatusBadge({ status }: { status: Driver["status"] }) {
    const classes = {
      AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",

      BUSY: "border-amber-200 bg-amber-50 text-amber-700",

      OFFLINE: "border-slate-200 bg-slate-100 text-slate-600",

      INACTIVE: "border-red-200 bg-red-50 text-red-700",
    };

    return (
      <span
        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${classes[status]}`}
      >
        {status}
      </span>
    );
  }

  function updateClientFinance(
    key: keyof typeof clientFinance,
    value: string | boolean,
  ) {
    setClientFinance((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDriverFinance(
    key: keyof typeof driverFinance,
    value: string | boolean,
  ) {
    setDriverFinance((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateFinanceNote(key: keyof typeof financeNotes, value: string) {
    setFinanceNotes((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function NumberField({
    label,
    value,
    min = 0,
    onChange,
  }: {
    label: string;
    value: string;
    min?: number;
    onChange: (value: string) => void;
  }) {
    return (
      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-500">
          {label}
        </label>

        <input
          type="number"
          min={min}
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="booking-input text-center"
        />
      </div>
    );
  }

  function updateAllocationField(
    key: keyof typeof allocationFields,
    value: string,
  ) {
    setAllocationFields((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateNoteField(key: keyof typeof noteFields, value: string) {
    setNoteFields((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const selectedDriver =
    drivers.find((driver) => driver.id === allocationFields.assignedDriverId) ||
    null;

  function JourneySummaryItem({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-400">{label}</p>

        <p className="mt-1 truncate text-sm font-semibold text-slate-700">
          {value}
        </p>
      </div>
    );
  }

  function updateAccountField(key: keyof typeof accountFields, value: string) {
    setAccountFields((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateJourneyField(key: keyof typeof journeyFields, value: string) {
    setJourneyFields((current) => ({
      ...current,
      [key]: value,
      ...((key === "pickupAddress" || key === "dropoffAddress") && {
        routeDistanceMeters: "",
        routeDurationSeconds: "",
      }),
    }));
  }

  function addVia() {
    setVias((current) => [
      ...current,
      {
        id: `via-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        address: "",
      },
    ]);

    setJourneyFields((current) => ({
      ...current,
      routeDistanceMeters: "",
      routeDurationSeconds: "",
    }));
  }

  function updateVia(id: string, value: string) {
    setVias((current) =>
      current.map((via) =>
        via.id === id
          ? {
              ...via,
              address: value,
            }
          : via,
      ),
    );

    setJourneyFields((current) => ({
      ...current,
      routeDistanceMeters: "",
      routeDurationSeconds: "",
    }));
  }

  function removeVia(id: string) {
    setVias((current) => current.filter((via) => via.id !== id));

    setJourneyFields((current) => ({
      ...current,
      routeDistanceMeters: "",
      routeDurationSeconds: "",
    }));
  }

  function toggleAdditionalBooker(id: string) {
    setAdditionalBookerIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  function toggleAdditionalPassenger(id: string) {
    setAdditionalPassengerIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) || null;

  const primaryBooker =
    bookers.find((booker) => booker.id === primaryBookerId) || null;

  const primaryPassenger =
    passengers.find((passenger) => passenger.id === primaryPassengerId) || null;

  async function createBooking() {
    setSubmitError("");
    setSubmitSuccess("");

    /* =====================================================
     VALIDATION
  ===================================================== */

    if (!selectedAccountId) {
      setSubmitError("Please select a client account.");
      return;
    }

    if (!primaryPassenger) {
      setSubmitError("Please select a primary passenger.");
      return;
    }

    if (!primaryPassenger.phone?.trim()) {
      setSubmitError(
        "The primary passenger must have a phone number before this booking can be created.",
      );
      return;
    }

    if (!journeyFields.pickupDate) {
      setSubmitError("Pick-up date is required.");
      return;
    }

    if (!journeyFields.pickupTime) {
      setSubmitError("Pick-up time is required.");
      return;
    }

    if (!journeyFields.pickupAddress.trim()) {
      setSubmitError("Pick-up address is required.");
      return;
    }

    if (!journeyFields.dropoffAddress.trim()) {
      setSubmitError("Drop-off address is required.");
      return;
    }

    const passengerCount = Number(journeyFields.passengerCount);

    if (!Number.isInteger(passengerCount) || passengerCount < 1) {
      setSubmitError("Passenger count must be at least 1.");
      return;
    }

    const estimatedDuration = Number(journeyFields.estimatedDurationMinutes);

    if (!Number.isInteger(estimatedDuration) || estimatedDuration < 1) {
      setSubmitError("Estimated duration must be at least 1 minute.");
      return;
    }

    /* =====================================================
     PICKUP DATETIME

     Treat date/time entered in the form as Europe/London,
     irrespective of the admin computer's local timezone.
  ===================================================== */

    let pickupDatetime: string;

    try {
      pickupDatetime = londonLocalDateTimeToIso(
        journeyFields.pickupDate,
        journeyFields.pickupTime,
      );
    } catch {
      setSubmitError("Unable to process the selected pick-up date and time.");
      return;
    }

    /* =====================================================
     BOOKERS
  ===================================================== */

    const bookingBookers: Array<{
      bookerId: string;
      isPrimary: boolean;
      position: number;
    }> = [];

    if (primaryBookerId) {
      bookingBookers.push({
        bookerId: primaryBookerId,
        isPrimary: true,
        position: 0,
      });
    }

    const cleanAdditionalBookerIds = [...new Set(additionalBookerIds)].filter(
      (id) => id && id !== primaryBookerId,
    );

    cleanAdditionalBookerIds.forEach((bookerId, index) => {
      bookingBookers.push({
        bookerId,
        isPrimary: false,
        position: primaryBookerId ? index + 1 : index,
      });
    });

    /* =====================================================
     PASSENGERS
  ===================================================== */

    const bookingPassengers = [
      {
        passengerId: primaryPassengerId,
        isPrimary: true,
        position: 0,
      },

      ...[...new Set(additionalPassengerIds)]
        .filter((id) => id && id !== primaryPassengerId)
        .map((passengerId, index) => ({
          passengerId,
          isPrimary: false,
          position: index + 1,
        })),
    ];

    /* =====================================================
     VIA STOPS
  ===================================================== */

    const bookingVias = vias
      .map((via) => ({
        address: via.address.trim(),
      }))
      .filter((via) => via.address.length > 0)
      .map((via, index) => ({
        address: via.address,
        position: index,
      }));

    /* =====================================================
     COUNTS
  ===================================================== */

    const bigLuggage = safeInteger(journeyFields.bigLuggage);

    const smallLuggage = safeInteger(journeyFields.smallLuggage);

    /* =====================================================
     PAYLOAD
  ===================================================== */

    const payload = {
      /* ---------------- COMPATIBILITY CUSTOMER ---------------- */

      customerName: primaryPassenger.name,

      customerPhone: primaryPassenger.phone.trim(),

      customerEmail: primaryPassenger.email?.trim() || undefined,

      /* ---------------- ACCOUNT ---------------- */

      accountId: selectedAccountId,

      costCenter: accountFields.costCenter.trim() || undefined,

      invoiceRef: accountFields.invoiceRef.trim() || undefined,

      jobStatus: accountFields.jobStatus || "CONFIRMED",

      salesman: accountFields.salesman.trim() || undefined,

      nameCardOverride: accountFields.nameCardOverride.trim() || undefined,

      nameCardFileUrl: accountFields.nameCardFileUrl.trim() || undefined,

      /* ---------------- JOURNEY ---------------- */

      pickupAddress: journeyFields.pickupAddress.trim(),

      dropoffAddress: journeyFields.dropoffAddress.trim(),

      pickupDatetime,

      journeyType: journeyFields.journeyType,

      passengers: passengerCount,

      luggage: bigLuggage + smallLuggage,

      bigLuggage,

      smallLuggage,

      babySeats: safeInteger(journeyFields.babySeats),

      childSeats: safeInteger(journeyFields.childSeats),

      boosterSeats: safeInteger(journeyFields.boosterSeats),

      /* ---------------- ROUTE ---------------- */

      routeDistanceMeters: optionalInteger(journeyFields.routeDistanceMeters),

      routeDurationSeconds: optionalInteger(journeyFields.routeDurationSeconds),

      estimatedDurationMinutes: estimatedDuration,

      /* ---------------- VEHICLE / DRIVER ---------------- */

      preferredVehicleCategory:
        allocationFields.preferredVehicleCategory || undefined,

      requestedDriverType: allocationFields.requestedDriverType || undefined,

      assignedDriverId: allocationFields.assignedDriverId || undefined,

      /* ---------------- NOTES ---------------- */

      notes: noteFields.notes.trim() || undefined,

      driverNote: noteFields.driverNote.trim() || undefined,

      /* ---------------- CONTACT RELATIONS ---------------- */

      bookers: bookingBookers.length ? bookingBookers : undefined,

      passengersList: bookingPassengers,

      vias: bookingVias.length ? bookingVias : undefined,

      /* ---------------- FINANCE ---------------- */

      finance: {
        clientQuote: optionalMoney(clientFinance.clientQuote),

        clientWaitingCharge: optionalMoney(clientFinance.clientWaitingCharge),

        clientParking: optionalMoney(clientFinance.clientParking),

        clientCongestion: optionalMoney(clientFinance.clientCongestion),

        clientDiscount: optionalMoney(clientFinance.clientDiscount),

        clientTotal: optionalMoney(clientFinance.clientTotal),

        clientAdminFee: optionalMoney(clientFinance.clientAdminFee),

        clientNet: optionalMoney(clientFinance.clientNet),

        clientVat: optionalMoney(clientFinance.clientVat),

        clientVatPercent: optionalMoney(clientFinance.clientVatPercent),

        clientTotalAmount: optionalMoney(clientFinance.clientTotalAmount),

        clientWaitingIncluded: clientFinance.clientWaitingIncluded,

        clientParkingIncluded: clientFinance.clientParkingIncluded,

        clientPriceOverride: clientFinance.clientPriceOverride,

        /* ---------------- DRIVER FINANCE ---------------- */

        driverCost: optionalMoney(driverFinance.driverCost),

        driverWaitingPay: optionalMoney(driverFinance.driverWaitingPay),

        driverParking: optionalMoney(driverFinance.driverParking),

        driverCongestion: optionalMoney(driverFinance.driverCongestion),

        driverTotal: optionalMoney(driverFinance.driverTotal),

        driverWaitingIncluded: driverFinance.driverWaitingIncluded,

        driverParkingIncluded: driverFinance.driverParkingIncluded,

        driverPayAsStandard: driverFinance.driverPayAsStandard,

        driverPriceOverride: driverFinance.driverPriceOverride,

        /* ---------------- PAYMENT ---------------- */

        paymentType: clientFinance.paymentType || undefined,

        /* ---------------- FINANCE NOTES ---------------- */

        financeNote: financeNotes.financeNote.trim() || undefined,

        invoiceNote: financeNotes.invoiceNote.trim() || undefined,

        extraNote: financeNotes.extraNote.trim() || undefined,
      },
    };

    /* =====================================================
     CREATE
  ===================================================== */

    try {
      setSavingBooking(true);

      const response = await api.post("/bookings", payload);

      setSubmitSuccess(
        `Booking ${response.data.bookingReference} created successfully.`,
      );

      window.setTimeout(() => {
        router.push("/dashboard/bookings");
      }, 800);
    } catch (err: any) {
      console.error("Unable to create booking:", err);

      const message = err?.response?.data?.message;

      setSubmitError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to create booking.",
      );
    } finally {
      setSavingBooking(false);
    }
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />

          <p className="mt-3 text-sm text-slate-500">
            Preparing booking form...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/bookings")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Bookings
          </button>

          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              New Booking
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create and allocate a new chauffeur booking.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAccounts(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* =================================================
          ACCOUNT ALLOCATION
      ================================================= */}

      <FormSection
        title="Account Allocation"
        description="Select the client account and booking allocation details."
        icon={<Building2 size={18} />}
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Field label="Select Account" required>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="booking-input"
            >
              <option value="">Select client account...</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode
                    ? `${account.name} — ${account.accountCode}`
                    : account.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cost Center">
            <input
              value={accountFields.costCenter}
              onChange={(e) => updateAccountField("costCenter", e.target.value)}
              className="booking-input"
              placeholder="e.g. Executive"
            />
          </Field>

          <Field label="Invoice Ref">
            <input
              value={accountFields.invoiceRef}
              onChange={(e) => updateAccountField("invoiceRef", e.target.value)}
              className="booking-input"
              placeholder="PO / invoice reference"
            />
          </Field>

          <Field label="Job Status">
            <select
              value={accountFields.jobStatus}
              onChange={(e) => updateAccountField("jobStatus", e.target.value)}
              className="booking-input"
            >
              <option value="CONFIRMED">Confirmed</option>

              <option value="PROVISIONAL">Provisional</option>

              <option value="QUOTED">Quoted</option>

              <option value="ON_HOLD">On Hold</option>
            </select>
          </Field>

          <Field label="Salesman">
            <input
              value={accountFields.salesman}
              onChange={(e) => updateAccountField("salesman", e.target.value)}
              className="booking-input"
              placeholder="Salesman / account manager"
            />
          </Field>

          <Field label="Name Card Override">
            <input
              value={accountFields.nameCardOverride}
              onChange={(e) =>
                updateAccountField("nameCardOverride", e.target.value)
              }
              className="booking-input"
              placeholder="Optional display name"
            />
          </Field>

          <Field label="Name Card File URL" span>
            <input
              type="url"
              value={accountFields.nameCardFileUrl}
              onChange={(e) =>
                updateAccountField("nameCardFileUrl", e.target.value)
              }
              className="booking-input"
              placeholder="https://..."
            />

            <p className="mt-2 text-xs text-slate-400">
              Actual document upload will be connected later. For now this
              accepts an existing file URL.
            </p>
          </Field>
        </div>

        {selectedAccount && (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 shrink-0 text-blue-600" size={18} />

              <div>
                <p className="font-semibold text-slate-800">
                  {selectedAccount.name}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                  {selectedAccount.accountCode && (
                    <span>Account: {selectedAccount.accountCode}</span>
                  )}

                  {selectedAccount.email && (
                    <span>{selectedAccount.email}</span>
                  )}

                  {selectedAccount.phone && (
                    <span>{selectedAccount.phone}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </FormSection>

      {/* =================================================
          BOOKER
      ================================================= */}

      <FormSection
        title="Booker"
        description="Select the person making or managing this booking."
        icon={<UserRound size={18} />}
        action={
          <button
            type="button"
            onClick={() => setQuickBookerOpen(true)}
            disabled={!selectedAccountId}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} />
            Quick Add Booker
          </button>
        }
      >
        {!selectedAccountId ? (
          <RequiredAccountMessage />
        ) : (
          <div className="space-y-6">
            <Field label="Select Preset Booker">
              <select
                value={primaryBookerId}
                onChange={(e) => {
                  setPrimaryBookerId(e.target.value);

                  setAdditionalBookerIds((current) =>
                    current.filter((id) => id !== e.target.value),
                  );
                }}
                className="booking-input"
              >
                <option value="">Select booker...</option>

                {bookers.map((booker) => (
                  <option key={booker.id} value={booker.id}>
                    {booker.name}
                    {booker.phone ? ` — ${booker.phone}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            {primaryBooker && (
              <PersonSummary
                title="Primary Booker"
                name={primaryBooker.name}
                phone={primaryBooker.phone}
                email={primaryBooker.email}
              />
            )}

            <div>
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700">
                  Additional Booker(s)
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Select any additional people who should be linked to this
                  booking.
                </p>
              </div>

              {bookers.filter((booker) => booker.id !== primaryBookerId)
                .length ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {bookers
                    .filter((booker) => booker.id !== primaryBookerId)
                    .map((booker) => {
                      const selected = additionalBookerIds.includes(booker.id);

                      return (
                        <PresetToggle
                          key={booker.id}
                          name={booker.name}
                          secondary={
                            booker.phone || booker.email || "No contact details"
                          }
                          selected={selected}
                          onClick={() => toggleAdditionalBooker(booker.id)}
                        />
                      );
                    })}
                </div>
              ) : (
                <EmptyText>No additional bookers available.</EmptyText>
              )}
            </div>
          </div>
        )}
      </FormSection>

      {/* =================================================
          PASSENGER
      ================================================= */}

      <FormSection
        title="Passenger"
        description="Select the main traveller and any additional passengers."
        icon={<UsersRound size={18} />}
        action={
          <button
            type="button"
            onClick={() => setQuickPassengerOpen(true)}
            disabled={!selectedAccountId}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} />
            Quick Add Passenger
          </button>
        }
      >
        {!selectedAccountId ? (
          <RequiredAccountMessage />
        ) : (
          <div className="space-y-6">
            <Field label="Select Preset Passenger" required>
              <select
                value={primaryPassengerId}
                onChange={(e) => {
                  setPrimaryPassengerId(e.target.value);

                  setAdditionalPassengerIds((current) =>
                    current.filter((id) => id !== e.target.value),
                  );
                }}
                className="booking-input"
              >
                <option value="">Select passenger...</option>

                {passengers.map((passenger) => (
                  <option key={passenger.id} value={passenger.id}>
                    {passenger.name}
                    {passenger.phone ? ` — ${passenger.phone}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            {primaryPassenger && (
              <PersonSummary
                title="Primary Passenger"
                name={primaryPassenger.name}
                phone={primaryPassenger.phone}
                email={primaryPassenger.email}
              />
            )}

            <div>
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700">
                  Additional Passenger(s)
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Link any other known passengers travelling on this job.
                </p>
              </div>

              {passengers.filter(
                (passenger) => passenger.id !== primaryPassengerId,
              ).length ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {passengers
                    .filter((passenger) => passenger.id !== primaryPassengerId)
                    .map((passenger) => {
                      const selected = additionalPassengerIds.includes(
                        passenger.id,
                      );

                      return (
                        <PresetToggle
                          key={passenger.id}
                          name={passenger.name}
                          secondary={
                            passenger.phone ||
                            passenger.email ||
                            "No contact details"
                          }
                          selected={selected}
                          onClick={() =>
                            toggleAdditionalPassenger(passenger.id)
                          }
                        />
                      );
                    })}
                </div>
              ) : (
                <EmptyText>No additional passengers available.</EmptyText>
              )}
            </div>
          </div>
        )}
      </FormSection>

      {/* =================================================
    JOURNEY DETAILS
================================================= */}

      <FormSection
        title="Journey Details"
        description="Enter the journey schedule, route and passenger requirements."
        icon={<Route size={18} />}
        action={
          <button
            type="button"
            onClick={addVia}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Plus size={15} />
            Add Via
          </button>
        }
      >
        <div className="space-y-6">
          {/* =============================================
        JOURNEY TYPE / DATE / TIME
    ============================================= */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Journey Type" required>
              <select
                value={journeyFields.journeyType}
                onChange={(e) =>
                  updateJourneyField("journeyType", e.target.value)
                }
                className="booking-input"
              >
                <option value="TRANSFER">Transfer</option>

                <option value="ONE_WAY">One Way</option>

                <option value="RETURN">Return</option>

                <option value="HOURLY">Hourly</option>

                <option value="AS_DIRECTED">As Directed</option>
              </select>
            </Field>

            <Field label="Pick-Up Date" required>
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={journeyFields.pickupDate}
                  onChange={(e) =>
                    updateJourneyField("pickupDate", e.target.value)
                  }
                  className="booking-input"
                  style={{ paddingLeft: "2.75rem" }}
                />
              </div>
            </Field>

            <Field label="Pick-Up Time" required>
              <div className="relative">
                <Clock3
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="time"
                  value={journeyFields.pickupTime}
                  onChange={(e) =>
                    updateJourneyField("pickupTime", e.target.value)
                  }
                  className="booking-input"
                  style={{ paddingLeft: "2.75rem" }}
                />
              </div>
            </Field>

            <Field label="Estimated Duration">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={journeyFields.estimatedDurationMinutes}
                  onChange={(e) =>
                    updateJourneyField(
                      "estimatedDurationMinutes",
                      e.target.value,
                    )
                  }
                  className="booking-input pr-20"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  minutes
                </span>
              </div>
            </Field>
          </div>

          {/* =============================================
        ROUTE
    ============================================= */}

          <BookingRoutePlanner
            pickupAddress={journeyFields.pickupAddress}
            dropoffAddress={journeyFields.dropoffAddress}
            vias={vias}
            routeDistanceMeters={journeyFields.routeDistanceMeters}
            routeDurationSeconds={journeyFields.routeDurationSeconds}
            onPickupAddressChange={(value) =>
              updateJourneyField("pickupAddress", value)
            }
            onDropoffAddressChange={(value) =>
              updateJourneyField("dropoffAddress", value)
            }
            onViaAddressChange={updateVia}
            onRemoveVia={removeVia}
            onRouteCalculated={({ distanceMeters, durationSeconds }) => {
              setJourneyFields((current) => ({
                ...current,
                routeDistanceMeters: String(distanceMeters),
                routeDurationSeconds: String(durationSeconds),
                estimatedDurationMinutes: String(
                  Math.max(1, Math.ceil(durationSeconds / 60)),
                ),
              }));
            }}
          />

          {/* =============================================
        PASSENGERS / LUGGAGE
    ============================================= */}

          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Passenger & Luggage Requirements
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                These values are used for vehicle selection and driver
                information.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <NumberField
                label="Passengers"
                value={journeyFields.passengerCount}
                min={1}
                onChange={(value) =>
                  updateJourneyField("passengerCount", value)
                }
              />

              <NumberField
                label="Big Luggage"
                value={journeyFields.bigLuggage}
                onChange={(value) => updateJourneyField("bigLuggage", value)}
              />

              <NumberField
                label="Small Luggage"
                value={journeyFields.smallLuggage}
                onChange={(value) => updateJourneyField("smallLuggage", value)}
              />

              <NumberField
                label="Baby Seats"
                value={journeyFields.babySeats}
                onChange={(value) => updateJourneyField("babySeats", value)}
              />

              <NumberField
                label="Child Seats"
                value={journeyFields.childSeats}
                onChange={(value) => updateJourneyField("childSeats", value)}
              />

              <NumberField
                label="Booster Seats"
                value={journeyFields.boosterSeats}
                onChange={(value) => updateJourneyField("boosterSeats", value)}
              />
            </div>
          </div>

          {/* =============================================
        JOURNEY SUMMARY
    ============================================= */}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <JourneySummaryItem
              label="Route"
              value={
                journeyFields.pickupAddress && journeyFields.dropoffAddress
                  ? `${journeyFields.pickupAddress} → ${journeyFields.dropoffAddress}`
                  : "Route incomplete"
              }
            />

            <JourneySummaryItem label="Via Stops" value={String(vias.length)} />

            <JourneySummaryItem
              label="Passengers"
              value={journeyFields.passengerCount || "0"}
            />

            <JourneySummaryItem
              label="Estimated Duration"
              value={`${journeyFields.estimatedDurationMinutes || "0"} min`}
            />
          </div>
        </div>
      </FormSection>

      {/* =================================================
    VEHICLE & DRIVER ALLOCATION
================================================= */}

      <FormSection
        title="Vehicle & Driver Allocation"
        description="Choose the requested vehicle class and optionally assign a driver."
        icon={<Car size={18} />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Field label="Preferred Vehicle Category" required>
              <select
                value={allocationFields.preferredVehicleCategory}
                onChange={(e) =>
                  updateAllocationField(
                    "preferredVehicleCategory",
                    e.target.value,
                  )
                }
                className="booking-input"
              >
                <option value="Executive">Executive</option>

                <option value="Ultra Luxury">Ultra Luxury</option>

                <option value="SUV">SUV</option>

                <option value="Group & Coach">Group & Coach</option>

                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="Driver Type">
              <select
                value={allocationFields.requestedDriverType}
                onChange={(e) =>
                  updateAllocationField("requestedDriverType", e.target.value)
                }
                className="booking-input"
              >
                <option value="">Any Driver Type</option>

                <option value="Owner Driver">Owner Driver</option>

                <option value="Company Driver">Company Driver</option>

                <option value="Chauffeur">Chauffeur</option>

                <option value="Subcontractor">Subcontractor</option>
              </select>
            </Field>

            <Field label="Assign Driver">
              <select
                value={allocationFields.assignedDriverId}
                onChange={(e) =>
                  updateAllocationField("assignedDriverId", e.target.value)
                }
                className="booking-input"
                disabled={driverLoading}
              >
                <option value="">
                  {driverLoading ? "Loading drivers..." : "Leave unassigned"}
                </option>

                {drivers
                  .filter((driver) => driver.status !== "INACTIVE")
                  .map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.callSign ? `${driver.callSign} — ` : ""}
                      {driver.name}
                      {driver.driverType ? ` — ${driver.driverType}` : ""}
                      {` — ${driver.status}`}
                    </option>
                  ))}
              </select>

              <p className="mt-2 text-xs text-slate-400">
                Busy and offline drivers remain selectable for future bookings.
                The backend will reject actual time conflicts.
              </p>
            </Field>
          </div>

          {selectedDriver && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <UserCog size={19} />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {selectedDriver.name}
                      </p>

                      {selectedDriver.callSign && (
                        <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                          {selectedDriver.callSign}
                        </span>
                      )}

                      <DriverStatusBadge status={selectedDriver.status} />
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedDriver.driverType || "Driver"}

                      {selectedDriver.driverGrade
                        ? ` • ${selectedDriver.driverGrade}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2 lg:text-right">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Vehicle
                    </p>

                    <p className="mt-1 font-medium text-slate-700">
                      {selectedDriver.vehicleName || "No compatibility vehicle"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Registration
                    </p>

                    <p className="mt-1 font-medium text-slate-700">
                      {selectedDriver.vehicleNumber || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedDriver.status === "BUSY" && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  This driver is currently busy. They may still be assigned to a
                  future booking if there is no schedule overlap.
                </div>
              )}

              {selectedDriver.status === "OFFLINE" && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                  This driver is currently offline, but future assignment is
                  allowed. Scheduling conflicts are checked when the booking is
                  saved.
                </div>
              )}
            </div>
          )}

          {!selectedDriver && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-6">
              <p className="text-sm font-semibold text-slate-600">
                Driver assignment is optional
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                You can create the booking as Pending and assign a driver later
                from the Dispatch board.
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* =================================================
    BOOKING NOTES
================================================= */}

      <FormSection
        title="Booking Notes"
        description="Internal and driver-facing notes for this job."
        icon={<NotebookText size={18} />}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field label="General Booking Note">
            <textarea
              rows={6}
              value={noteFields.notes}
              onChange={(e) => updateNoteField("notes", e.target.value)}
              className="booking-input resize-none"
              placeholder="Internal booking notes..."
            />
          </Field>

          <Field label="Driver Note">
            <textarea
              rows={6}
              value={noteFields.driverNote}
              onChange={(e) => updateNoteField("driverNote", e.target.value)}
              className="booking-input resize-none"
              placeholder="Information the driver should see..."
            />

            <p className="mt-2 text-xs text-slate-400">
              Use this for passenger instructions, meet-and-greet information,
              luggage assistance or other driver-facing details.
            </p>
          </Field>
        </div>
      </FormSection>

      {/* =================================================
    CLIENT FINANCE
================================================= */}

      <FormSection
        title="Client Finance"
        description="Charges and billing values applied to the client."
        icon={<BadgePoundSterling size={18} />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            <MoneyField
              label="Quote"
              value={clientFinance.clientQuote}
              onChange={(value) => updateClientFinance("clientQuote", value)}
            />

            <MoneyField
              label="Waiting Time Charge"
              value={clientFinance.clientWaitingCharge}
              onChange={(value) =>
                updateClientFinance("clientWaitingCharge", value)
              }
            />

            <MoneyField
              label="Parking"
              value={clientFinance.clientParking}
              onChange={(value) => updateClientFinance("clientParking", value)}
            />

            <MoneyField
              label="Congestion"
              value={clientFinance.clientCongestion}
              onChange={(value) =>
                updateClientFinance("clientCongestion", value)
              }
            />

            <MoneyField
              label="Discount"
              value={clientFinance.clientDiscount}
              onChange={(value) => updateClientFinance("clientDiscount", value)}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="mb-4 flex items-center gap-3">
              <ReceiptText size={17} className="text-slate-500" />

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Client Totals
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  These values remain editable until the client&apos;s pricing
                  rules are finalized.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
              <MoneyField
                label="Total"
                value={clientFinance.clientTotal}
                onChange={(value) => updateClientFinance("clientTotal", value)}
              />

              <MoneyField
                label="Admin Fee"
                value={clientFinance.clientAdminFee}
                onChange={(value) =>
                  updateClientFinance("clientAdminFee", value)
                }
              />

              <MoneyField
                label="Net"
                value={clientFinance.clientNet}
                onChange={(value) => updateClientFinance("clientNet", value)}
              />

              <MoneyField
                label="VAT"
                value={clientFinance.clientVat}
                onChange={(value) => updateClientFinance("clientVat", value)}
              />

              <Field label="VAT %">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={clientFinance.clientVatPercent}
                    onChange={(e) =>
                      updateClientFinance("clientVatPercent", e.target.value)
                    }
                    className="booking-input pr-10"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    %
                  </span>
                </div>
              </Field>

              <MoneyField
                label="Total Amount"
                value={clientFinance.clientTotalAmount}
                onChange={(value) =>
                  updateClientFinance("clientTotalAmount", value)
                }
                emphasis
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FinanceToggle
              label="Waiting Included"
              description="Waiting charge already included in the client price."
              checked={clientFinance.clientWaitingIncluded}
              onChange={(checked) =>
                updateClientFinance("clientWaitingIncluded", checked)
              }
            />

            <FinanceToggle
              label="Parking Included"
              description="Parking charge already included in the client price."
              checked={clientFinance.clientParkingIncluded}
              onChange={(checked) =>
                updateClientFinance("clientParkingIncluded", checked)
              }
            />

            <FinanceToggle
              label="Price Override"
              description="Final client price has been manually overridden."
              checked={clientFinance.clientPriceOverride}
              onChange={(checked) =>
                updateClientFinance("clientPriceOverride", checked)
              }
            />
          </div>

          <div className="border-t border-slate-200 pt-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Field label="Payment Type">
                <div className="relative">
                  <CreditCard
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={clientFinance.paymentType}
                    onChange={(e) =>
                      updateClientFinance("paymentType", e.target.value)
                    }
                    className="booking-input"
                    style={{ paddingLeft: "2.75rem" }}
                  >
                    <option value="ACCOUNT">Account</option>

                    <option value="CARD">Card</option>

                    <option value="CASH">Cash</option>

                    <option value="BANK_TRANSFER">Bank Transfer</option>

                    <option value="INVOICE">Invoice</option>

                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </Field>
            </div>
          </div>
        </div>
      </FormSection>

      {/* =================================================
    DRIVER FINANCE
================================================= */}

      <FormSection
        title="Driver Finance"
        description="Driver pay and job-related driver costs."
        icon={<BadgePoundSterling size={18} />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            <MoneyField
              label="Driver Cost"
              value={driverFinance.driverCost}
              onChange={(value) => updateDriverFinance("driverCost", value)}
            />

            <MoneyField
              label="Waiting Time Pay"
              value={driverFinance.driverWaitingPay}
              onChange={(value) =>
                updateDriverFinance("driverWaitingPay", value)
              }
            />

            <MoneyField
              label="Parking"
              value={driverFinance.driverParking}
              onChange={(value) => updateDriverFinance("driverParking", value)}
            />

            <MoneyField
              label="Congestion"
              value={driverFinance.driverCongestion}
              onChange={(value) =>
                updateDriverFinance("driverCongestion", value)
              }
            />

            <MoneyField
              label="Driver Total"
              value={driverFinance.driverTotal}
              onChange={(value) => updateDriverFinance("driverTotal", value)}
              emphasis
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FinanceToggle
              label="Waiting Included"
              description="Driver waiting pay is included in the agreed cost."
              checked={driverFinance.driverWaitingIncluded}
              onChange={(checked) =>
                updateDriverFinance("driverWaitingIncluded", checked)
              }
            />

            <FinanceToggle
              label="Parking Included"
              description="Driver parking is included in the agreed cost."
              checked={driverFinance.driverParkingIncluded}
              onChange={(checked) =>
                updateDriverFinance("driverParkingIncluded", checked)
              }
            />

            <FinanceToggle
              label="Pay As Standard"
              description="Use standard driver payment terms."
              checked={driverFinance.driverPayAsStandard}
              onChange={(checked) =>
                updateDriverFinance("driverPayAsStandard", checked)
              }
            />

            <FinanceToggle
              label="Price Override"
              description="Driver cost has been manually overridden."
              checked={driverFinance.driverPriceOverride}
              onChange={(checked) =>
                updateDriverFinance("driverPriceOverride", checked)
              }
            />
          </div>
        </div>
      </FormSection>

      {/* =================================================
    FINANCE & INVOICE NOTES
================================================= */}

      <FormSection
        title="Finance & Invoice Notes"
        description="Private accounting, invoice and administration notes."
        icon={<ReceiptText size={18} />}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field label="Finance Note">
            <textarea
              rows={5}
              value={financeNotes.financeNote}
              onChange={(e) => updateFinanceNote("financeNote", e.target.value)}
              className="booking-input resize-none"
              placeholder="Internal finance notes..."
            />
          </Field>

          <Field label="Invoice Note">
            <textarea
              rows={5}
              value={financeNotes.invoiceNote}
              onChange={(e) => updateFinanceNote("invoiceNote", e.target.value)}
              className="booking-input resize-none"
              placeholder="Information that should appear or be considered on the invoice..."
            />
          </Field>

          <Field label="Additional Internal Note" span>
            <textarea
              rows={4}
              value={financeNotes.extraNote}
              onChange={(e) => updateFinanceNote("extraNote", e.target.value)}
              className="booking-input resize-none"
              placeholder="Other internal finance/admin information..."
            />
          </Field>
        </div>
      </FormSection>

      {/* =================================================
          CREATE BOOKING
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Create Booking
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review the information above before creating the booking.
                {allocationFields.assignedDriverId
                  ? " The selected driver's schedule will be checked before assignment."
                  : " This booking will be created as Pending and can be assigned later."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/dashboard/bookings")}
                disabled={savingBooking}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createBooking}
                disabled={savingBooking}
                className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBooking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Create Booking
                  </>
                )}
              </button>
            </div>
          </div>

          {submitError && (
            <div className="mt-5">
              <ErrorMessage>{submitError}</ErrorMessage>
            </div>
          )}

          {submitSuccess && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {submitSuccess}
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          CURRENT DATA PREVIEW
      ================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Step 1 Status
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatusCheck
            label="Account"
            complete={Boolean(selectedAccountId)}
            value={selectedAccount?.name}
          />

          <StatusCheck
            label="Booker"
            complete={Boolean(primaryBookerId)}
            value={primaryBooker?.name}
          />

          <StatusCheck
            label="Passenger"
            complete={Boolean(primaryPassengerId)}
            value={primaryPassenger?.name}
          />
        </div>
      </section>

      {/* =================================================
          QUICK ADD BOOKER
      ================================================= */}

      {quickBookerOpen && selectedAccountId && (
        <QuickBookerModal
          accountId={selectedAccountId}
          onClose={() => setQuickBookerOpen(false)}
          onSaved={async (created) => {
            setBookers((current) => [...current, created]);

            setPrimaryBookerId(created.id);

            setQuickBookerOpen(false);
          }}
        />
      )}

      {/* =================================================
          QUICK ADD PASSENGER
      ================================================= */}

      {quickPassengerOpen && selectedAccountId && (
        <QuickPassengerModal
          accountId={selectedAccountId}
          onClose={() => setQuickPassengerOpen(false)}
          onSaved={async (created) => {
            setPassengers((current) => [...current, created]);

            setPrimaryPassengerId(created.id);

            setQuickPassengerOpen(false);
          }}
        />
      )}

      <style jsx global>{`
        .booking-input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .booking-input:focus {
          border-color: rgb(100 116 139);
          box-shadow: 0 0 0 3px rgb(241 245 249);
        }

        .booking-input:disabled {
          cursor: not-allowed;
          background: rgb(248 250 252);
          color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
}

/* =====================================================
   QUICK ADD BOOKER
===================================================== */

function QuickBookerModal({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: string;
  onClose: () => void;
  onSaved: (booker: Booker) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const name = [form.firstName.trim(), form.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    if (!name) {
      setError("Booker name is required.");

      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await api.post<Booker>("/clients/bookers", {
        accountId,

        firstName: form.firstName.trim() || undefined,

        lastName: form.lastName.trim() || undefined,

        name,

        phone: form.phone.trim() || undefined,

        email: form.email.trim() || undefined,

        notes: form.notes.trim() || undefined,
      });

      await onSaved(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to create booker.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Quick Add Booker" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <input
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Last Name">
            <input
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="booking-input resize-none"
            />
          </Field>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Add Booker"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

/* =====================================================
   QUICK ADD PASSENGER
===================================================== */

function QuickPassengerModal({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: string;
  onClose: () => void;
  onSaved: (passenger: Passenger) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const name = [form.firstName.trim(), form.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    if (!name) {
      setError("Passenger name is required.");

      return;
    }

    if (!form.phone.trim()) {
      setError(
        "Passenger phone is required because the booking needs customer contact details.",
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await api.post<Passenger>("/clients/passengers", {
        accountId,

        firstName: form.firstName.trim() || undefined,

        lastName: form.lastName.trim() || undefined,

        name,

        phone: form.phone.trim(),

        email: form.email.trim() || undefined,

        notes: form.notes.trim() || undefined,
      });

      await onSaved(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to create passenger.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Quick Add Passenger" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <input
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Last Name">
            <input
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Phone" required>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="booking-input"
            />
          </Field>

          <Field label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="booking-input resize-none"
            />
          </Field>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Add Passenger"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

/* =====================================================
   UI
===================================================== */

function FormSection({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
            {icon}
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">{title}</h2>

            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  span = false,
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={span ? "xl:col-span-3" : ""}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function PersonSummary({
  title,
  name,
  phone,
  email,
}: {
  title: string;
  name: string;
  phone: string | null;
  email: string | null;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
          <Check size={16} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {title}
          </p>

          <p className="mt-1 font-semibold text-slate-800">{name}</p>

          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            {phone && <span>{phone}</span>}

            {email && <span>{email}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetToggle({
  name,
  secondary,
  selected,
  onClick,
}: {
  name: string;
  secondary: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div>
        <p
          className={`text-sm font-semibold ${
            selected ? "text-white" : "text-slate-700"
          }`}
        >
          {name}
        </p>

        <p
          className={`mt-1 text-xs ${
            selected ? "text-slate-300" : "text-slate-400"
          }`}
        >
          {secondary}
        </p>
      </div>

      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? "border-white/30 bg-white/10 text-white"
            : "border-slate-200 text-transparent"
        }`}
      >
        <Check size={14} />
      </div>
    </button>
  );
}

function StatusCheck({
  label,
  complete,
  value,
}: {
  label: string;
  complete: boolean;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          complete
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {complete ? <Check size={15} /> : <Search size={14} />}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>

        <p className="truncate text-sm font-semibold text-slate-700">
          {value || "Not selected"}
        </p>
      </div>
    </div>
  );
}

function RequiredAccountMessage() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-9 text-center">
      <Building2 className="mx-auto text-slate-300" size={24} />

      <p className="mt-3 font-semibold text-slate-600">
        Select an account first
      </p>

      <p className="mt-1 text-sm text-slate-400">
        Preset contacts will load automatically from the selected account.
      </p>
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-400">
      {children}
    </div>
  );
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

/* =====================================================
   MODAL
===================================================== */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  saveLabel,
  onClose,
}: {
  saving: boolean;
  saveLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}

        {saveLabel}
      </button>
    </div>
  );
}

function safeInteger(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
}

function optionalInteger(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return undefined;
  }

  return Math.max(0, Math.floor(number));
}

function optionalMoney(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return undefined;
  }

  return number;
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",

    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",

    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}

function londonLocalDateTimeToIso(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  const [hour, minute] = timeValue.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error("Invalid date/time");
  }

  const wallClockAsUtc = new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0),
  );

  const timeZone = "Europe/London";

  let offset = getTimeZoneOffset(wallClockAsUtc, timeZone);

  let actualUtc = new Date(wallClockAsUtc.getTime() - offset);

  /*
   * Recalculate once because the
   * first conversion could cross a
   * daylight-saving boundary.
   */
  offset = getTimeZoneOffset(actualUtc, timeZone);

  actualUtc = new Date(wallClockAsUtc.getTime() - offset);

  return actualUtc.toISOString();
}
