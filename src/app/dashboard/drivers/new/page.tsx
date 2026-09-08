"use client";

import { FormEvent, ReactNode, useState } from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Car,
  CheckCircle2,
  CreditCard,
  FileText,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import api from "@/lib/api";

type FormData = {
  driverType: string;

  firstName: string;
  lastName: string;

  phone: string;
  alternatePhone: string;

  dateOfBirth: string;

  email: string;

  streetTown: string;
  postCode: string;

  photo: string;

  companyJoiningDate: string;

  taxInformation: string;

  accountStatus: string;
  activeDate: string;

  callSign: string;
  driverGrade: string;

  status: string;

  dvlaCode: string;

  drivingLicencePoints: string;

  drivingSinceMonth: string;
  drivingSinceYear: string;

  previouslyWorkedCompanies: string;

  bankName: string;
  accountHolderName: string;

  accountNumber: string;
  sortCode: string;

  signedProofDocumentUrl: string;

  statementCycle: string;
  paymentCycle: string;
  paymentDueDate: string;

  defaultCommission: string;

  profileNote: string;
  controllerNote: string;

  password: string;
  confirmPassword: string;
};

const initialForm: FormData = {
  driverType: "Owner Driver",

  firstName: "",
  lastName: "",

  phone: "",
  alternatePhone: "",

  dateOfBirth: "",

  email: "",

  streetTown: "",
  postCode: "",

  photo: "",

  companyJoiningDate: "",

  taxInformation: "",

  accountStatus: "ACTIVE",
  activeDate: "",

  callSign: "",
  driverGrade: "Standard",

  status: "AVAILABLE",

  dvlaCode: "",

  drivingLicencePoints: "0",

  drivingSinceMonth: "",
  drivingSinceYear: "",

  previouslyWorkedCompanies: "",

  bankName: "",
  accountHolderName: "",

  accountNumber: "",
  sortCode: "",

  signedProofDocumentUrl: "",

  statementCycle: "Monthly",
  paymentCycle: "Weekly",
  paymentDueDate: "",

  defaultCommission: "",

  profileNote: "",
  controllerNote: "",

  password: "",
  confirmPassword: "",
};

export default function AddDriverPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(initialForm);

  const [createLogin, setCreateLogin] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function optionalString(value: string) {
    const trimmed = value.trim();

    return trimmed ? trimmed : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.lastName.trim()) {
      setError("Last name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (createLogin) {
      if (!form.email.trim()) {
        setError("Email is required when creating driver app access.");
        return;
      }

      if (!form.password) {
        setError("Password is required when creating driver app access.");
        return;
      }

      if (form.password.length < 6) {
        setError("Password must contain at least 6 characters.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("Password and confirm password do not match.");
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        driverType: optionalString(form.driverType),

        firstName: form.firstName.trim(),

        lastName: form.lastName.trim(),

        phone: form.phone.trim(),

        alternatePhone: optionalString(form.alternatePhone),

        dateOfBirth: form.dateOfBirth || undefined,

        email: optionalString(form.email),

        streetTown: optionalString(form.streetTown),

        postCode: optionalString(form.postCode),

        photo: optionalString(form.photo),

        companyJoiningDate: form.companyJoiningDate || undefined,

        taxInformation: optionalString(form.taxInformation),

        accountStatus: form.accountStatus,

        activeDate: form.activeDate || undefined,

        callSign: optionalString(form.callSign),

        driverGrade: optionalString(form.driverGrade),

        status: form.status,

        dvlaCode: optionalString(form.dvlaCode),

        drivingLicencePoints: form.drivingLicencePoints
          ? Number(form.drivingLicencePoints)
          : undefined,

        drivingSinceMonth: form.drivingSinceMonth
          ? Number(form.drivingSinceMonth)
          : undefined,

        drivingSinceYear: form.drivingSinceYear
          ? Number(form.drivingSinceYear)
          : undefined,

        previouslyWorkedCompanies: optionalString(
          form.previouslyWorkedCompanies,
        ),

        bankName: optionalString(form.bankName),

        accountHolderName: optionalString(form.accountHolderName),

        accountNumber: optionalString(form.accountNumber),

        sortCode: optionalString(form.sortCode),

        signedProofDocumentUrl: optionalString(form.signedProofDocumentUrl),

        statementCycle: optionalString(form.statementCycle),

        paymentCycle: optionalString(form.paymentCycle),

        paymentDueDate: optionalString(form.paymentDueDate),

        defaultCommission: form.defaultCommission
          ? Number(form.defaultCommission)
          : undefined,

        profileNote: optionalString(form.profileNote),

        controllerNote: optionalString(form.controllerNote),

        ...(createLogin
          ? {
              password: form.password,
            }
          : {}),
      };

      const response = await api.post("/drivers", payload);

      setSuccess(true);

      const driverId = response.data.id;

      setTimeout(() => {
        router.push(`/dashboard/drivers/${driverId}`);
      }, 700);
    } catch (err: any) {
      console.error("Failed to create driver:", err);

      const message = err?.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to create driver.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}

      <div className="mb-7">
        <button
          type="button"
          onClick={() => router.push("/dashboard/drivers")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Drivers
        </button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Add Driver
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create a complete driver profile, finance information and
            application access.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Driver Type */}

        <Section
          title="Driver Information"
          description="Driver type and personal information."
          icon={<UserRound size={19} />}
        >
          <FormGrid>
            <Field label="Driver Type" required>
              <select
                value={form.driverType}
                onChange={(e) => updateField("driverType", e.target.value)}
                className="input"
              >
                <option value="Owner Driver">Owner Driver</option>

                <option value="Company Driver">Company Driver</option>

                <option value="Freelance Driver">Freelance Driver</option>

                <option value="Subcontractor">Subcontractor</option>
              </select>
            </Field>

            <Field label="Driver ID / Call Sign">
              <input
                value={form.callSign}
                onChange={(e) => updateField("callSign", e.target.value)}
                placeholder="e.g. D1001"
                className="input uppercase"
              />
            </Field>

            <Field label="First Name" required>
              <input
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="First name"
                className="input"
              />
            </Field>

            <Field label="Last Name" required>
              <input
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Last name"
                className="input"
              />
            </Field>

            <Field label="Phone Number" required>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+44..."
                className="input"
              />
            </Field>

            <Field label="Alternative Phone Number">
              <input
                value={form.alternatePhone}
                onChange={(e) => updateField("alternatePhone", e.target.value)}
                placeholder="+44..."
                className="input"
              />
            </Field>

            <Field label="Date of Birth">
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="driver@example.com"
                className="input"
              />
            </Field>

            <Field label="Street & Town">
              <input
                value={form.streetTown}
                onChange={(e) => updateField("streetTown", e.target.value)}
                placeholder="36 Brockley Grove, London"
                className="input"
              />
            </Field>

            <Field label="Post Code">
              <input
                value={form.postCode}
                onChange={(e) => updateField("postCode", e.target.value)}
                placeholder="SE4 1QY"
                className="input uppercase"
              />
            </Field>

            <Field label="Company Joining Date" required>
              <input
                type="date"
                value={form.companyJoiningDate}
                onChange={(e) =>
                  updateField("companyJoiningDate", e.target.value)
                }
                className="input"
              />
            </Field>

            <Field label="Tax Information">
              <input
                value={form.taxInformation}
                onChange={(e) => updateField("taxInformation", e.target.value)}
                placeholder="e.g. Self Employed"
                className="input"
              />
            </Field>

            <Field label="Profile Picture URL" span>
              <input
                type="url"
                value={form.photo}
                onChange={(e) => updateField("photo", e.target.value)}
                placeholder="https://..."
                className="input"
              />
            </Field>
          </FormGrid>
        </Section>

        {/* Account */}

        <Section
          title="Account & Operational Status"
          description="Control whether the driver is active and available for work."
          icon={<ShieldCheck size={19} />}
        >
          <FormGrid>
            <Field label="Account Status">
              <select
                value={form.accountStatus}
                onChange={(e) => updateField("accountStatus", e.target.value)}
                className="input"
              >
                <option value="ACTIVE">Active</option>

                <option value="HOLD">Hold</option>

                <option value="SUSPENDED">Suspended</option>

                <option value="CLOSED">Closed</option>
              </select>
            </Field>

            <Field label="Active Date">
              <input
                type="date"
                value={form.activeDate}
                onChange={(e) => updateField("activeDate", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Operational Status">
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="input"
              >
                <option value="AVAILABLE">Available</option>

                <option value="OFFLINE">Offline</option>

                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>

            <Field label="Driver Grade">
              <select
                value={form.driverGrade}
                onChange={(e) => updateField("driverGrade", e.target.value)}
                className="input"
              >
                <option value="Standard">Standard</option>

                <option value="Premium">Premium</option>

                <option value="Executive">Executive</option>

                <option value="VIP">VIP</option>
              </select>
            </Field>
          </FormGrid>
        </Section>

        {/* Experience */}

        <Section
          title="Experience Details"
          description="Driving history and DVLA information."
          icon={<BriefcaseBusiness size={19} />}
        >
          <FormGrid>
            <Field label="DVLA Code">
              <input
                value={form.dvlaCode}
                onChange={(e) => updateField("dvlaCode", e.target.value)}
                placeholder="DVLA code"
                className="input"
              />
            </Field>

            <Field label="Driving Licence Points">
              <input
                type="number"
                min="0"
                value={form.drivingLicencePoints}
                onChange={(e) =>
                  updateField("drivingLicencePoints", e.target.value)
                }
                className="input"
              />
            </Field>

            <Field label="Driving Since — Month">
              <select
                value={form.drivingSinceMonth}
                onChange={(e) =>
                  updateField("drivingSinceMonth", e.target.value)
                }
                className="input"
              >
                <option value="">Select month</option>

                {[
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
                ].map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Driving Since — Year">
              <input
                type="number"
                min="1900"
                max="2100"
                value={form.drivingSinceYear}
                onChange={(e) =>
                  updateField("drivingSinceYear", e.target.value)
                }
                placeholder="e.g. 2005"
                className="input"
              />
            </Field>

            <Field label="Previously Worked Companies" span>
              <textarea
                value={form.previouslyWorkedCompanies}
                onChange={(e) =>
                  updateField("previouslyWorkedCompanies", e.target.value)
                }
                rows={4}
                placeholder="Previous chauffeur or transport companies..."
                className="input resize-none"
              />
            </Field>
          </FormGrid>
        </Section>

        {/* Finance */}

        <Section
          title="Bank & Finance Details"
          description="Driver payment, commission and account information."
          icon={<CreditCard size={19} />}
        >
          <FormGrid>
            <Field label="Bank Name">
              <input
                value={form.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
                placeholder="Bank name"
                className="input"
              />
            </Field>

            <Field label="Account Holder Name">
              <input
                value={form.accountHolderName}
                onChange={(e) =>
                  updateField("accountHolderName", e.target.value)
                }
                placeholder="Account holder"
                className="input"
              />
            </Field>

            <Field label="Account Number">
              <input
                value={form.accountNumber}
                onChange={(e) => updateField("accountNumber", e.target.value)}
                placeholder="Account number"
                className="input"
              />
            </Field>

            <Field label="Sort Code">
              <input
                value={form.sortCode}
                onChange={(e) => updateField("sortCode", e.target.value)}
                placeholder="20-00-00"
                className="input"
              />
            </Field>

            <Field label="Statement Cycle">
              <select
                value={form.statementCycle}
                onChange={(e) => updateField("statementCycle", e.target.value)}
                className="input"
              >
                <option value="Weekly">Weekly</option>

                <option value="Fortnightly">Fortnightly</option>

                <option value="Monthly">Monthly</option>
              </select>
            </Field>

            <Field label="Payment Cycle">
              <select
                value={form.paymentCycle}
                onChange={(e) => updateField("paymentCycle", e.target.value)}
                className="input"
              >
                <option value="Weekly">Weekly</option>

                <option value="Fortnightly">Fortnightly</option>

                <option value="Monthly">Monthly</option>
              </select>
            </Field>

            <Field label="Payment Due Date">
              <input
                value={form.paymentDueDate}
                onChange={(e) => updateField("paymentDueDate", e.target.value)}
                placeholder="e.g. Friday"
                className="input"
              />
            </Field>

            <Field label="Default Commission (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.defaultCommission}
                onChange={(e) =>
                  updateField("defaultCommission", e.target.value)
                }
                placeholder="e.g. 20"
                className="input"
              />
            </Field>

            <Field label="Written & Signed Proof URL" span>
              <input
                type="url"
                value={form.signedProofDocumentUrl}
                onChange={(e) =>
                  updateField("signedProofDocumentUrl", e.target.value)
                }
                placeholder="https://..."
                className="input"
              />
            </Field>
          </FormGrid>
        </Section>

        {/* Notes */}

        <Section
          title="Driver Notes"
          description="Internal notes for administrators and controllers."
          icon={<FileText size={19} />}
        >
          <FormGrid>
            <Field label="Profile Note" span>
              <textarea
                value={form.profileNote}
                onChange={(e) => updateField("profileNote", e.target.value)}
                rows={5}
                placeholder="General internal driver notes..."
                className="input resize-none"
              />
            </Field>

            <Field
              label="Controller Note"
              span
              description="This note can later be shown to controllers on job summaries."
            >
              <textarea
                value={form.controllerNote}
                onChange={(e) => updateField("controllerNote", e.target.value)}
                rows={5}
                placeholder="Important operational information..."
                className="input resize-none"
              />
            </Field>
          </FormGrid>
        </Section>

        {/* App Access */}

        <Section
          title="Driver App Access"
          description="Optionally create the driver's mobile application login now."
          icon={<KeyRound size={19} />}
        >
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              id="create-login"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
              className="h-4 w-4"
            />

            <label htmlFor="create-login" className="cursor-pointer">
              <p className="text-sm font-semibold text-slate-800">
                Create driver login
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Creates a DRIVER user account linked to this profile.
              </p>
            </label>
          </div>

          {createLogin && (
            <FormGrid>
              <Field label="Login Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="driver@example.com"
                  className="input"
                />
              </Field>

              <div />

              <Field label="Password" required>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="input"
                />
              </Field>

              <Field label="Confirm Password" required>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm password"
                  className="input"
                />
              </Field>
            </FormGrid>
          )}
        </Section>

        {/* Messages */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={18} />
            Driver created successfully. Opening profile...
          </div>
        )}

        {/* Actions */}

        <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/drivers")}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Creating Driver...
              </>
            ) : (
              <>
                <Save size={17} />
                Create Driver
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }

        .input:focus {
          border-color: rgb(100 116 139);
          box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
        }

        .input::placeholder {
          color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>

          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
  );
}

function Field({
  label,
  required = false,
  description,
  span = false,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
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

      {description && (
        <p className="mt-1.5 text-xs leading-5 text-slate-400">{description}</p>
      )}
    </div>
  );
}
