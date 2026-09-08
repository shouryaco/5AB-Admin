"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  X,
  Pencil,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";

type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "INACTIVE";

type AccountStatus = "ACTIVE" | "HOLD" | "SUSPENDED" | "CLOSED";

type DocumentStatus = "ACTIVE" | "EXPIRED" | "INACTIVE";

type VehicleStatus = "ACTIVE" | "INACTIVE";

type DriverDocument = {
  id: string;
  driverId: string;
  documentType: string;
  title: string | null;
  fileUrl: string | null;
  status: DocumentStatus;
  issueDate: string | null;
  startDate: string | null;
  expiryDate: string | null;
  documentNumber: string | null;
  postCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type VehicleDocument = {
  id: string;
  vehicleId: string;
  documentType: string;
  title: string | null;
  fileUrl: string | null;
  status: DocumentStatus;
  issueDate: string | null;
  startDate: string | null;
  expiryDate: string | null;
  documentNumber: string | null;
  notes: string | null;
};

type Vehicle = {
  id: string;
  driverId: string;

  vehicleCategory: string | null;
  vehicleType: string;
  registrationNumber: string;

  keeperName: string | null;
  keeperAddress: string | null;

  purchaseDate: string | null;
  companyJoiningDate: string | null;

  status: VehicleStatus;

  isPrimary: boolean;

  notes: string | null;

  documents: VehicleDocument[];

  createdAt: string;
  updatedAt: string;
};

type Booking = {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;

  pickupAddress: string;
  dropoffAddress: string;

  pickupDatetime: string;

  journeyType: string | null;

  status: string;

  passengers: number | null;
  luggage: number | null;

  completedAt?: string | null;
};

type DriverProfile = {
  id: string;

  name: string;

  firstName: string | null;
  lastName: string | null;

  driverType: string | null;
  callSign: string | null;

  phone: string;
  alternatePhone: string | null;

  email: string | null;

  photo: string | null;

  dateOfBirth: string | null;

  streetTown: string | null;
  postCode: string | null;

  companyJoiningDate: string | null;

  taxInformation: string | null;

  accountStatus: AccountStatus;

  activeDate: string | null;

  driverGrade: string | null;

  status: DriverStatus;

  dvlaCode: string | null;

  drivingLicencePoints: number | null;

  drivingSinceMonth: number | null;
  drivingSinceYear: number | null;

  previouslyWorkedCompanies: string | null;

  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  sortCode: string | null;

  signedProofDocumentUrl: string | null;

  statementCycle: string | null;
  paymentCycle: string | null;
  paymentDueDate: string | null;

  defaultCommission: number | null;

  profileNote: string | null;
  controllerNote: string | null;

  latitude: number | null;
  longitude: number | null;

  lastLocationUpdate: string | null;

  appAccessEnabled: boolean;
  appAccessSentAt: string | null;

  createdAt: string;
  updatedAt: string;

  lastJobDate: string | null;

  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLoginAt: string | null;
    createdAt: string;
  } | null;

  documents: DriverDocument[];

  vehicles: Vehicle[];

  bookings: Booking[];
};

const driverStatusStyles: Record<DriverStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",

  BUSY: "border-amber-200 bg-amber-50 text-amber-700",

  OFFLINE: "border-slate-200 bg-slate-100 text-slate-600",

  INACTIVE: "border-red-200 bg-red-50 text-red-700",
};

const accountStatusStyles: Record<AccountStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",

  HOLD: "border-amber-200 bg-amber-50 text-amber-700",

  SUSPENDED: "border-red-200 bg-red-50 text-red-700",

  CLOSED: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function DriverProfilePage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const driverId = params.id;

  const [driver, setDriver] = useState<DriverProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  const [driverDocumentModalOpen, setDriverDocumentModalOpen] = useState(false);

  const [vehicleDocumentVehicle, setVehicleDocumentVehicle] =
    useState<Vehicle | null>(null);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [editingDriverDocument, setEditingDriverDocument] =
    useState<DriverDocument | null>(null);

  const [editingVehicleDocument, setEditingVehicleDocument] = useState<{
    vehicle: Vehicle;
    document: VehicleDocument;
  } | null>(null);

  const fetchDriver = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get<DriverProfile>(`/drivers/${driverId}`);

        setDriver(response.data);
      } catch (err) {
        console.error("Failed to load driver:", err);

        setError("Unable to load driver profile.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [driverId],
  );

  useEffect(() => {
    if (driverId) {
      fetchDriver();
    }
  }, [driverId, fetchDriver]);

  async function deleteDriverDocument(documentId: string) {
    const confirmed = window.confirm("Delete this driver document?");

    if (!confirmed) return;

    try {
      await api.delete(`/drivers/${driverId}/documents/${documentId}`);

      await fetchDriver(true);
    } catch (err) {
      console.error(err);

      alert("Unable to delete document.");
    }
  }

  async function deleteVehicle(vehicleId: string) {
    const confirmed = window.confirm("Delete this vehicle and its documents?");

    if (!confirmed) return;

    try {
      await api.delete(`/drivers/${driverId}/vehicles/${vehicleId}`);

      await fetchDriver(true);
    } catch (err) {
      console.error(err);

      alert("Unable to delete vehicle.");
    }
  }

  async function deleteVehicleDocument(vehicleId: string, documentId: string) {
    const confirmed = window.confirm("Delete this vehicle document?");

    if (!confirmed) return;

    try {
      await api.delete(
        `/drivers/${driverId}/vehicles/${vehicleId}/documents/${documentId}`,
      );

      await fetchDriver(true);
    } catch (err) {
      console.error(err);

      alert("Unable to delete vehicle document.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />

          <p className="mt-3 text-sm text-slate-500">
            Loading driver profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Driver profile unavailable
          </p>

          <p className="mt-1 text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={() => fetchDriver()}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back */}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/drivers")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Drivers
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/drivers/${driver.id}/edit`)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Pencil size={15} />
            Edit Driver
          </button>

          <button
            type="button"
            onClick={() => fetchDriver(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Profile Header */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              {driver.photo ? (
                <img
                  src={driver.photo}
                  alt={driver.name}
                  className="h-24 w-24 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-3xl font-bold text-white">
                  {driver.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                    {driver.name}
                  </h1>

                  {driver.callSign && (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {driver.callSign}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {driver.driverType || "Driver"}

                  {driver.driverGrade && ` • ${driver.driverGrade}`}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge className={driverStatusStyles[driver.status]}>
                    {formatText(driver.status)}
                  </StatusBadge>

                  <StatusBadge
                    className={accountStatusStyles[driver.accountStatus]}
                  >
                    Account {formatText(driver.accountStatus)}
                  </StatusBadge>

                  <StatusBadge
                    className={
                      driver.appAccessEnabled
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-100 text-slate-500"
                    }
                  >
                    {driver.appAccessEnabled
                      ? "App Access Enabled"
                      : "No App Access"}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="grid min-w-[250px] grid-cols-1 gap-2 text-sm">
              <HeaderInfo icon={<Phone size={15} />} value={driver.phone} />

              <HeaderInfo
                icon={<Mail size={15} />}
                value={driver.email || "No email"}
              />

              <HeaderInfo
                icon={<MapPin size={15} />}
                value={
                  [driver.streetTown, driver.postCode]
                    .filter(Boolean)
                    .join(", ") || "No address"
                }
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}

        <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50/70 md:grid-cols-4">
          <QuickStat label="Vehicles" value={driver.vehicles.length} />

          <QuickStat label="Documents" value={driver.documents.length} />

          <QuickStat label="Recent Jobs" value={driver.bookings.length} />

          <QuickStat
            label="Last Job"
            value={driver.lastJobDate ? formatDate(driver.lastJobDate) : "—"}
          />
        </div>
      </section>

      {/* Personal + Experience */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InfoSection title="Personal Details" icon={<UserRound size={18} />}>
          <DetailsGrid>
            <Detail label="First Name" value={driver.firstName} />

            <Detail label="Last Name" value={driver.lastName} />

            <Detail label="Phone" value={driver.phone} />

            <Detail label="Alternative Phone" value={driver.alternatePhone} />

            <Detail
              label="Date of Birth"
              value={driver.dateOfBirth ? formatDate(driver.dateOfBirth) : null}
            />

            <Detail label="Email" value={driver.email} />

            <Detail label="Street & Town" value={driver.streetTown} />

            <Detail label="Post Code" value={driver.postCode} />

            <Detail
              label="Joining Date"
              value={
                driver.companyJoiningDate
                  ? formatDate(driver.companyJoiningDate)
                  : null
              }
            />

            <Detail label="Tax Information" value={driver.taxInformation} />
          </DetailsGrid>
        </InfoSection>

        <InfoSection
          title="Experience Details"
          icon={<BriefcaseBusiness size={18} />}
        >
          <DetailsGrid>
            <Detail label="DVLA Code" value={driver.dvlaCode} />

            <Detail
              label="Licence Points"
              value={
                driver.drivingLicencePoints !== null
                  ? String(driver.drivingLicencePoints)
                  : null
              }
            />

            <Detail
              label="Driving Since"
              value={formatDrivingSince(
                driver.drivingSinceMonth,
                driver.drivingSinceYear,
              )}
            />

            <Detail label="Driver Grade" value={driver.driverGrade} />

            <Detail
              label="Previously Worked Companies"
              value={driver.previouslyWorkedCompanies}
              span
            />
          </DetailsGrid>
        </InfoSection>
      </div>

      {/* Finance + App */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InfoSection title="Bank & Finance" icon={<Banknote size={18} />}>
          <DetailsGrid>
            <Detail label="Bank Name" value={driver.bankName} />

            <Detail label="Account Holder" value={driver.accountHolderName} />

            <Detail label="Account Number" value={driver.accountNumber} />

            <Detail label="Sort Code" value={driver.sortCode} />

            <Detail label="Statement Cycle" value={driver.statementCycle} />

            <Detail label="Payment Cycle" value={driver.paymentCycle} />

            <Detail label="Payment Due" value={driver.paymentDueDate} />

            <Detail
              label="Commission"
              value={
                driver.defaultCommission !== null
                  ? `${driver.defaultCommission}%`
                  : null
              }
            />
          </DetailsGrid>
        </InfoSection>

        <InfoSection title="Account & App Access" icon={<KeyRound size={18} />}>
          <DetailsGrid>
            <Detail
              label="Account Status"
              value={formatText(driver.accountStatus)}
            />

            <Detail
              label="Operational Status"
              value={formatText(driver.status)}
            />

            <Detail
              label="App Access"
              value={driver.appAccessEnabled ? "Enabled" : "Disabled"}
            />

            <Detail label="Login Email" value={driver.user?.email} />

            <Detail
              label="Last Login"
              value={
                driver.user?.lastLoginAt
                  ? formatDateTime(driver.user.lastLoginAt)
                  : "Never"
              }
            />

            <Detail
              label="Account Created"
              value={
                driver.user?.createdAt
                  ? formatDate(driver.user.createdAt)
                  : null
              }
            />
          </DetailsGrid>
        </InfoSection>
      </div>

      {/* Notes */}

      <InfoSection title="Driver Notes" icon={<FileText size={18} />}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <NoteCard title="Profile Note" value={driver.profileNote} />

          <NoteCard title="Controller Note" value={driver.controllerNote} />
        </div>
      </InfoSection>

      {/* Driver Documents */}

      <InfoSection
        title="Driver Documents"
        icon={<FileText size={18} />}
        action={
          <button
            type="button"
            onClick={() => setDriverDocumentModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus size={15} />
            Add Document
          </button>
        }
      >
        {driver.documents.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {driver.documents.map((document) => (
              <DocumentCard
                key={document.id}
                title={document.title || formatText(document.documentType)}
                status={document.status}
                number={document.documentNumber}
                expiry={document.expiryDate}
                fileUrl={document.fileUrl}
                onEdit={() => setEditingDriverDocument(document)}
                onDelete={() => deleteDriverDocument(document.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No driver documents"
            description="Add driving licence, National Insurance, PCO card or other documents."
          />
        )}
      </InfoSection>

      {/* Vehicles */}

      <InfoSection
        title="Vehicles"
        icon={<Car size={18} />}
        action={
          <button
            type="button"
            onClick={() => setVehicleModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus size={15} />
            Add Vehicle
          </button>
        }
      >
        {driver.vehicles.length ? (
          <div className="space-y-5">
            {driver.vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="overflow-hidden rounded-2xl border border-slate-200"
              >
                <div className="flex flex-col gap-4 bg-slate-50/70 p-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {vehicle.vehicleType}
                      </h3>

                      {vehicle.isPrimary && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Primary
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          vehicle.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </div>

                    <p className="mt-1 font-medium text-slate-600">
                      {vehicle.registrationNumber}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {vehicle.vehicleCategory || "No vehicle category"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingVehicle(vehicle)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      <Pencil size={14} />
                      Edit Vehicle
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleDocumentVehicle(vehicle)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Plus size={14} />
                      Add Document
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteVehicle(vehicle.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 border-t border-slate-200 p-5 md:grid-cols-3">
                  <Detail label="Keeper" value={vehicle.keeperName} />

                  <Detail
                    label="Purchase Date"
                    value={
                      vehicle.purchaseDate
                        ? formatDate(vehicle.purchaseDate)
                        : null
                    }
                  />

                  <Detail
                    label="Company Joining Date"
                    value={
                      vehicle.companyJoiningDate
                        ? formatDate(vehicle.companyJoiningDate)
                        : null
                    }
                  />

                  <Detail
                    label="Keeper Address"
                    value={vehicle.keeperAddress}
                    span
                  />
                </div>

                <div className="border-t border-slate-200 p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Vehicle Documents
                  </p>

                  {vehicle.documents.length ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {vehicle.documents.map((document) => (
                        <DocumentCard
                          key={document.id}
                          title={
                            document.title || formatText(document.documentType)
                          }
                          status={document.status}
                          number={document.documentNumber}
                          expiry={document.expiryDate}
                          fileUrl={document.fileUrl}
                          onEdit={() =>
                            setEditingVehicleDocument({
                              vehicle,
                              document,
                            })
                          }
                          onDelete={() =>
                            deleteVehicleDocument(vehicle.id, document.id)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No vehicle documents added.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No vehicles"
            description="Add the driver's vehicle and registration information."
          />
        )}
      </InfoSection>

      {/* Recent Jobs */}

      <InfoSection title="Recent Jobs" icon={<CalendarDays size={18} />}>
        {driver.bookings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Booking
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Passenger
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pickup
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Journey
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {driver.bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">
                        {booking.bookingReference}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(booking.pickupDatetime)}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {booking.customerName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {booking.customerPhone}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="max-w-[220px] truncate text-sm text-slate-600">
                        {booking.pickupAddress}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="max-w-[220px] truncate text-sm text-slate-600">
                        {booking.dropoffAddress}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No jobs yet"
            description="Jobs assigned to this driver will appear here automatically."
          />
        )}
      </InfoSection>

      {/* Add Vehicle Modal */}

      {vehicleModalOpen && (
        <AddVehicleModal
          driverId={driverId}
          onClose={() => setVehicleModalOpen(false)}
          onSaved={async () => {
            setVehicleModalOpen(false);

            await fetchDriver(true);
          }}
        />
      )}

      {/* Add Driver Document */}

      {driverDocumentModalOpen && (
        <AddDriverDocumentModal
          driverId={driverId}
          onClose={() => setDriverDocumentModalOpen(false)}
          onSaved={async () => {
            setDriverDocumentModalOpen(false);

            await fetchDriver(true);
          }}
        />
      )}

      {/* Add Vehicle Document */}

      {vehicleDocumentVehicle && (
        <AddVehicleDocumentModal
          driverId={driverId}
          vehicle={vehicleDocumentVehicle}
          onClose={() => setVehicleDocumentVehicle(null)}
          onSaved={async () => {
            setVehicleDocumentVehicle(null);

            await fetchDriver(true);
          }}
        />
      )}

      {/* Edit Vehicle */}

      {editingVehicle && (
        <EditVehicleModal
          driverId={driverId}
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSaved={async () => {
            setEditingVehicle(null);
            await fetchDriver(true);
          }}
        />
      )}

      {/* Edit Driver Document */}

      {editingDriverDocument && (
        <EditDriverDocumentModal
          driverId={driverId}
          document={editingDriverDocument}
          onClose={() => setEditingDriverDocument(null)}
          onSaved={async () => {
            setEditingDriverDocument(null);
            await fetchDriver(true);
          }}
        />
      )}

      {/* Edit Vehicle Document */}

      {editingVehicleDocument && (
        <EditVehicleDocumentModal
          driverId={driverId}
          vehicle={editingVehicleDocument.vehicle}
          document={editingVehicleDocument.document}
          onClose={() => setEditingVehicleDocument(null)}
          onSaved={async () => {
            setEditingVehicleDocument(null);
            await fetchDriver(true);
          }}
        />
      )}
    </div>
  );
}

/* =====================================================
   ADD VEHICLE
===================================================== */

function AddVehicleModal({
  driverId,
  onClose,
  onSaved,
}: {
  driverId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    vehicleCategory: "Executive",
    vehicleType: "",
    registrationNumber: "",
    keeperName: "",
    keeperAddress: "",
    purchaseDate: "",
    companyJoiningDate: "",
    status: "ACTIVE",
    isPrimary: true,
    notes: "",
  });

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.vehicleType.trim() || !form.registrationNumber.trim()) {
      setError("Vehicle type and registration number are required.");

      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(`/drivers/${driverId}/vehicles`, {
        vehicleCategory: form.vehicleCategory.trim() || undefined,

        vehicleType: form.vehicleType.trim(),

        registrationNumber: form.registrationNumber.trim(),

        keeperName: form.keeperName.trim() || undefined,

        keeperAddress: form.keeperAddress.trim() || undefined,

        purchaseDate: form.purchaseDate || undefined,

        companyJoiningDate: form.companyJoiningDate || undefined,

        status: form.status,

        isPrimary: form.isPrimary,

        notes: form.notes.trim() || undefined,
      });

      await onSaved();
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to create vehicle.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Vehicle" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <ModalGrid>
          <ModalField label="Vehicle Category">
            <input
              value={form.vehicleCategory}
              onChange={(e) => update("vehicleCategory", e.target.value)}
              className="modal-input"
              placeholder="Executive"
            />
          </ModalField>

          <ModalField label="Vehicle Type" required>
            <input
              value={form.vehicleType}
              onChange={(e) => update("vehicleType", e.target.value)}
              className="modal-input"
              placeholder="Mercedes-Benz V-Class"
            />
          </ModalField>

          <ModalField label="Registration" required>
            <input
              value={form.registrationNumber}
              onChange={(e) => update("registrationNumber", e.target.value)}
              className="modal-input uppercase"
              placeholder="KV20 MKC"
            />
          </ModalField>

          <ModalField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="modal-input"
            >
              <option value="ACTIVE">Active</option>

              <option value="INACTIVE">Inactive</option>
            </select>
          </ModalField>

          <ModalField label="Keeper Name">
            <input
              value={form.keeperName}
              onChange={(e) => update("keeperName", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Purchase Date">
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => update("purchaseDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Keeper Address" span>
            <input
              value={form.keeperAddress}
              onChange={(e) => update("keeperAddress", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Company Joining Date">
            <input
              type="date"
              value={form.companyJoiningDate}
              onChange={(e) => update("companyJoiningDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <div />

          <ModalField label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="modal-input resize-none"
              placeholder="Internal notes about this vehicle..."
            />
          </ModalField>
        </ModalGrid>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => update("isPrimary", e.target.checked)}
          />

          <div>
            <p className="text-sm font-semibold text-slate-700">
              Primary Vehicle
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Use this as the driver&apos;s primary vehicle.
            </p>
          </div>
        </label>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Add Vehicle"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function EditVehicleModal({
  driverId,
  vehicle,
  onClose,
  onSaved,
}: {
  driverId: string;
  vehicle: Vehicle;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    vehicleCategory: vehicle.vehicleCategory || "",

    vehicleType: vehicle.vehicleType || "",

    registrationNumber: vehicle.registrationNumber || "",

    keeperName: vehicle.keeperName || "",

    keeperAddress: vehicle.keeperAddress || "",

    purchaseDate: toDateInput(vehicle.purchaseDate),

    companyJoiningDate: toDateInput(vehicle.companyJoiningDate),

    status: vehicle.status,

    isPrimary: vehicle.isPrimary,

    notes: vehicle.notes || "",
  });

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.vehicleType.trim() || !form.registrationNumber.trim()) {
      setError("Vehicle type and registration number are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.patch(`/drivers/${driverId}/vehicles/${vehicle.id}`, {
        vehicleCategory: form.vehicleCategory.trim() || null,

        vehicleType: form.vehicleType.trim(),

        registrationNumber: form.registrationNumber.trim(),

        keeperName: form.keeperName.trim() || null,

        keeperAddress: form.keeperAddress.trim() || null,

        purchaseDate: form.purchaseDate || null,

        companyJoiningDate: form.companyJoiningDate || null,

        status: form.status,

        isPrimary: form.isPrimary,

        notes: form.notes.trim() || null,
      });

      await onSaved();
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to update vehicle.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Edit Vehicle — ${vehicle.registrationNumber}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <ModalGrid>
          <ModalField label="Vehicle Category">
            <input
              value={form.vehicleCategory}
              onChange={(e) => update("vehicleCategory", e.target.value)}
              className="modal-input"
              placeholder="Executive"
            />
          </ModalField>

          <ModalField label="Vehicle Type" required>
            <input
              value={form.vehicleType}
              onChange={(e) => update("vehicleType", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Registration" required>
            <input
              value={form.registrationNumber}
              onChange={(e) => update("registrationNumber", e.target.value)}
              className="modal-input uppercase"
            />
          </ModalField>

          <ModalField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="modal-input"
            >
              <option value="ACTIVE">Active</option>

              <option value="INACTIVE">Inactive</option>
            </select>
          </ModalField>

          <ModalField label="Keeper Name">
            <input
              value={form.keeperName}
              onChange={(e) => update("keeperName", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Purchase Date">
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => update("purchaseDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Keeper Address" span>
            <input
              value={form.keeperAddress}
              onChange={(e) => update("keeperAddress", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Company Joining Date">
            <input
              type="date"
              value={form.companyJoiningDate}
              onChange={(e) => update("companyJoiningDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <div />

          <ModalField label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="modal-input resize-none"
            />
          </ModalField>
        </ModalGrid>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => update("isPrimary", e.target.checked)}
          />

          <div>
            <p className="text-sm font-semibold text-slate-700">
              Primary Vehicle
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Use this vehicle as the driver's primary vehicle.
            </p>
          </div>
        </label>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Save Vehicle"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

/* =====================================================
   DRIVER DOCUMENT
===================================================== */

function AddDriverDocumentModal({
  driverId,
  onClose,
  onSaved,
}: {
  driverId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    documentType: "DRIVING_LICENCE",

    title: "Driving Licence Card",

    fileUrl: "",

    status: "ACTIVE",

    issueDate: "",

    startDate: "",

    expiryDate: "",

    documentNumber: "",

    postCode: "",

    notes: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.documentType.trim()) {
      setError("Document type is required.");

      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(`/drivers/${driverId}/documents`, {
        documentType: form.documentType,

        title: form.title.trim() || undefined,

        fileUrl: form.fileUrl.trim() || undefined,

        status: form.status,

        issueDate: form.issueDate || undefined,

        startDate: form.startDate || undefined,

        expiryDate: form.expiryDate || undefined,

        documentNumber: form.documentNumber.trim() || undefined,

        postCode: form.postCode.trim() || undefined,

        notes: form.notes.trim() || undefined,
      });

      await onSaved();
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to add document.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Driver Document" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <ModalGrid>
          <ModalField label="Document Type">
            <select
              value={form.documentType}
              onChange={(e) => update("documentType", e.target.value)}
              className="modal-input"
            >
              <option value="DRIVING_LICENCE">Driving Licence</option>

              <option value="NATIONAL_INSURANCE">National Insurance</option>

              <option value="PCO_CARD">PCO Card</option>

              <option value="PCO_PAPER">PCO Paper</option>

              <option value="OTHER">Other</option>
            </select>
          </ModalField>

          <ModalField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="modal-input"
            >
              <option value="ACTIVE">Active</option>

              <option value="EXPIRED">Expired</option>

              <option value="INACTIVE">Inactive</option>
            </select>
          </ModalField>

          <ModalField label="Title">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Document Number">
            <input
              value={form.documentNumber}
              onChange={(e) => update("documentNumber", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Issue Date">
            <input
              type="date"
              value={form.issueDate}
              onChange={(e) => update("issueDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Expiry Date">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Post Code">
            <input
              value={form.postCode}
              onChange={(e) => update("postCode", e.target.value)}
              className="modal-input uppercase"
            />
          </ModalField>

          <ModalField label="File URL" span>
            <input
              type="url"
              value={form.fileUrl}
              onChange={(e) => update("fileUrl", e.target.value)}
              placeholder="https://..."
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="modal-input resize-none"
              placeholder="Document notes..."
            />
          </ModalField>
        </ModalGrid>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Add Document"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function EditDriverDocumentModal({
  driverId,
  document,
  onClose,
  onSaved,
}: {
  driverId: string;
  document: DriverDocument;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    documentType: document.documentType,

    title: document.title || "",

    fileUrl: document.fileUrl || "",

    status: document.status,

    issueDate: toDateInput(document.issueDate),

    startDate: toDateInput(document.startDate),

    expiryDate: toDateInput(document.expiryDate),

    documentNumber: document.documentNumber || "",

    postCode: document.postCode || "",

    notes: document.notes || "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.documentType.trim()) {
      setError("Document type is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.patch(`/drivers/${driverId}/documents/${document.id}`, {
        documentType: form.documentType,

        title: form.title.trim() || null,

        fileUrl: form.fileUrl.trim() || null,

        status: form.status,

        issueDate: form.issueDate || null,

        startDate: form.startDate || null,

        expiryDate: form.expiryDate || null,

        documentNumber: form.documentNumber.trim() || null,

        postCode: form.postCode.trim() || null,

        notes: form.notes.trim() || null,
      });

      await onSaved();
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to update document.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit Driver Document" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <ModalGrid>
          <ModalField label="Document Type">
            <select
              value={form.documentType}
              onChange={(e) => update("documentType", e.target.value)}
              className="modal-input"
            >
              <option value="DRIVING_LICENCE">Driving Licence</option>

              <option value="NATIONAL_INSURANCE">National Insurance</option>

              <option value="PCO_CARD">PCO Card</option>

              <option value="PCO_PAPER">PCO Paper</option>

              <option value="OTHER">Other</option>
            </select>
          </ModalField>

          <ModalField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="modal-input"
            >
              <option value="ACTIVE">Active</option>

              <option value="EXPIRED">Expired</option>

              <option value="INACTIVE">Inactive</option>
            </select>
          </ModalField>

          <ModalField label="Title">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Document Number">
            <input
              value={form.documentNumber}
              onChange={(e) => update("documentNumber", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Issue Date">
            <input
              type="date"
              value={form.issueDate}
              onChange={(e) => update("issueDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Expiry Date">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Post Code">
            <input
              value={form.postCode}
              onChange={(e) => update("postCode", e.target.value)}
              className="modal-input uppercase"
            />
          </ModalField>

          <ModalField label="File URL" span>
            <input
              type="url"
              value={form.fileUrl}
              onChange={(e) => update("fileUrl", e.target.value)}
              className="modal-input"
              placeholder="https://..."
            />
          </ModalField>

          <ModalField label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="modal-input resize-none"
            />
          </ModalField>
        </ModalGrid>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Save Document"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function EditVehicleDocumentModal({
  driverId,
  vehicle,
  document,
  onClose,
  onSaved,
}: {
  driverId: string;
  vehicle: Vehicle;
  document: VehicleDocument;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    documentType: document.documentType,

    title: document.title || "",

    fileUrl: document.fileUrl || "",

    status: document.status,

    issueDate: toDateInput(document.issueDate),

    startDate: toDateInput(document.startDate),

    expiryDate: toDateInput(document.expiryDate),

    documentNumber: document.documentNumber || "",

    notes: document.notes || "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/drivers/${driverId}/vehicles/${vehicle.id}/documents/${document.id}`,
        {
          documentType: form.documentType,

          title: form.title.trim() || null,

          fileUrl: form.fileUrl.trim() || null,

          status: form.status,

          issueDate: form.issueDate || null,

          startDate: form.startDate || null,

          expiryDate: form.expiryDate || null,

          documentNumber: form.documentNumber.trim() || null,

          notes: form.notes.trim() || null,
        },
      );

      await onSaved();
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to update vehicle document.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Edit Document — ${vehicle.registrationNumber}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <ModalGrid>
          <ModalField label="Document Type">
            <select
              value={form.documentType}
              onChange={(e) => update("documentType", e.target.value)}
              className="modal-input"
            >
              <option value="INSURANCE_CERTIFICATE">
                Insurance Certificate
              </option>

              <option value="VEHICLE_PCO_LICENCE">Vehicle PCO Licence</option>

              <option value="LOG_BOOK">Log Book</option>

              <option value="MOT_CERTIFICATE">MOT Certificate</option>

              <option value="OTHER">Other</option>
            </select>
          </ModalField>

          <ModalField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="modal-input"
            >
              <option value="ACTIVE">Active</option>

              <option value="EXPIRED">Expired</option>

              <option value="INACTIVE">Inactive</option>
            </select>
          </ModalField>

          <ModalField label="Title">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Document Number">
            <input
              value={form.documentNumber}
              onChange={(e) => update("documentNumber", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Issue Date">
            <input
              type="date"
              value={form.issueDate}
              onChange={(e) => update("issueDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Expiry Date">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <div />

          <ModalField label="File URL" span>
            <input
              type="url"
              value={form.fileUrl}
              onChange={(e) => update("fileUrl", e.target.value)}
              placeholder="https://..."
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="modal-input resize-none"
            />
          </ModalField>
        </ModalGrid>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Save Document"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function toDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

/* =====================================================
   VEHICLE DOCUMENT
===================================================== */

function AddVehicleDocumentModal({
  driverId,
  vehicle,
  onClose,
  onSaved,
}: {
  driverId: string;
  vehicle: Vehicle;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    documentType: "INSURANCE_CERTIFICATE",

    title: "Car Insurance Certificate",

    fileUrl: "",

    status: "ACTIVE",

    issueDate: "",

    startDate: "",

    expiryDate: "",

    documentNumber: "",

    notes: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.documentType.trim()) {
      setError("Document type is required.");

      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(`/drivers/${driverId}/vehicles/${vehicle.id}/documents`, {
        documentType: form.documentType,

        title: form.title.trim() || undefined,

        fileUrl: form.fileUrl.trim() || undefined,

        status: form.status,

        issueDate: form.issueDate || undefined,

        startDate: form.startDate || undefined,

        expiryDate: form.expiryDate || undefined,

        documentNumber: form.documentNumber.trim() || undefined,

        notes: form.notes.trim() || undefined,
      });

      await onSaved();
    } catch (err: any) {
      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to add vehicle document.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Add Document — ${vehicle.registrationNumber}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <ModalGrid>
          <ModalField label="Document Type">
            <select
              value={form.documentType}
              onChange={(e) => update("documentType", e.target.value)}
              className="modal-input"
            >
              <option value="INSURANCE_CERTIFICATE">
                Insurance Certificate
              </option>

              <option value="VEHICLE_PCO_LICENCE">Vehicle PCO Licence</option>

              <option value="LOG_BOOK">Log Book</option>

              <option value="MOT_CERTIFICATE">MOT Certificate</option>

              <option value="OTHER">Other</option>
            </select>
          </ModalField>

          <ModalField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="modal-input"
            >
              <option value="ACTIVE">Active</option>

              <option value="EXPIRED">Expired</option>

              <option value="INACTIVE">Inactive</option>
            </select>
          </ModalField>

          <ModalField label="Title">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Document Number">
            <input
              value={form.documentNumber}
              onChange={(e) => update("documentNumber", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Issue Date">
            <input
              type="date"
              value={form.issueDate}
              onChange={(e) => update("issueDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Expiry Date">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="modal-input"
            />
          </ModalField>

          <div />

          <ModalField label="File URL" span>
            <input
              type="url"
              value={form.fileUrl}
              onChange={(e) => update("fileUrl", e.target.value)}
              placeholder="https://..."
              className="modal-input"
            />
          </ModalField>

          <ModalField label="Notes" span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="modal-input resize-none"
              placeholder="Vehicle document notes..."
            />
          </ModalField>
        </ModalGrid>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ModalActions
          saving={saving}
          saveLabel="Add Document"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

/* =====================================================
   UI HELPERS
===================================================== */

function InfoSection({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
            {icon}
          </div>

          <h2 className="font-semibold text-slate-900">{title}</h2>
        </div>

        {action}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function DetailsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
  span = false,
}: {
  label: string;
  value: string | null | undefined;
  span?: boolean;
}) {
  return (
    <div className={span ? "md:col-span-2" : ""}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

function NoteCard({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {value || "No notes added."}
      </p>
    </div>
  );
}

function QuickStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-r border-slate-200 p-4 last:border-r-0">
      <p className="text-xs text-slate-400">{label}</p>

      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function HeaderInfo({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <span className="text-slate-400">{icon}</span>

      <span className="truncate">{value}</span>
    </div>
  );
}

function StatusBadge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function DocumentCard({
  title,
  status,
  number,
  expiry,
  fileUrl,
  onEdit,
  onDelete,
}: {
  title: string;
  status: string;
  number: string | null;
  expiry: string | null;
  fileUrl: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const expired =
    expiry && new Date(expiry).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <FileText className="text-slate-400" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-slate-400 transition hover:text-slate-800"
            title="Edit document"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="text-slate-300 transition hover:text-red-500"
            title="Delete document"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <p className="mt-4 font-semibold text-slate-800">{title}</p>

      <span
        className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
          expired || status === "EXPIRED"
            ? "border-red-200 bg-red-50 text-red-700"
            : status === "INACTIVE"
              ? "border-slate-200 bg-slate-100 text-slate-500"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {expired ? "EXPIRED" : status}
      </span>

      {number && <p className="mt-3 text-xs text-slate-500">No: {number}</p>}

      <p className="mt-1 text-xs text-slate-400">
        Expiry: {expiry ? formatDate(expiry) : "—"}
      </p>

      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
        >
          View Document
        </a>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
      <FileText className="mx-auto text-slate-300" />

      <p className="mt-3 font-semibold text-slate-700">{title}</p>

      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

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
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">{children}</div>

        <style jsx global>{`
          .modal-input {
            width: 100%;
            border: 1px solid rgb(226 232 240);
            border-radius: 0.75rem;
            background: white;
            padding: 0.75rem 0.875rem;
            font-size: 0.875rem;
            color: rgb(15 23 42);
            outline: none;
          }

          .modal-input:focus {
            border-color: rgb(100 116 139);
          }
        `}</style>
      </div>
    </div>
  );
}

function ModalGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
}

function ModalField({
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
    <div className={span ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
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
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}

        {saveLabel}
      </button>
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

function formatText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function formatDrivingSince(month: number | null, year: number | null) {
  if (!month && !year) {
    return "—";
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (month && year) {
    return `${months[month - 1]} ${year}`;
  }

  return year ? String(year) : months[(month || 1) - 1];
}
