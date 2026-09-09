"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import api from "@/lib/api";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function SettingsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const loadProfile = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setProfileError("");

      const response = await api.get<CurrentUser>("/auth/me");

      setUser(response.data);

      setProfile({
        name: response.data.name || "",
        email: response.data.email || "",
      });
    } catch (err: any) {
      console.error("Unable to load profile:", err);

      const message = err?.response?.data?.message;

      setProfileError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to load your profile.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    setProfileError("");
    setProfileSuccess("");

    if (!profile.name.trim()) {
      setProfileError("Name is required.");
      return;
    }

    if (!profile.email.trim()) {
      setProfileError("Email is required.");
      return;
    }

    try {
      setSavingProfile(true);

      const response = await api.patch("/auth/me", {
        name: profile.name.trim(),
        email: profile.email.trim(),
      });

      if (response.data.access_token) {
        localStorage.setItem(
          "token",
          response.data.access_token,
        );
      }

      if (response.data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user),
        );

        setUser(response.data.user);

        setProfile({
          name: response.data.user.name || "",
          email: response.data.user.email || "",
        });
      }

      setProfileSuccess(
        response.data.message || "Profile updated successfully.",
      );
    } catch (err: any) {
      console.error("Unable to update profile:", err);

      const message = err?.response?.data?.message;

      setProfileError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!password.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (password.newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters.",
      );
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);

      const response = await api.patch(
        "/auth/change-password",
        {
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
        },
      );

      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordSuccess(
        response.data.message ||
          "Password changed successfully.",
      );
    } catch (err: any) {
      console.error("Unable to change password:", err);

      const message = err?.response?.data?.message;

      setPasswordError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Unable to change password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">
            Loading account settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your own account profile and password.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadProfile(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Reload Profile"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UserRound size={19} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Profile Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the name and email address used by your
                admin account.
              </p>
            </div>
          </div>

          {profileError && (
            <Alert
              className="mt-5"
              type="error"
              message={profileError}
            />
          )}

          {profileSuccess && (
            <Alert
              className="mt-5"
              type="success"
              message={profileSuccess}
            />
          )}

          <div className="mt-6 space-y-5">
            <Field label="Name">
              <div className="relative">
                <UserRound
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={profile.name}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="settings-input"
                  style={{ paddingLeft: "2.75rem" }}
                  placeholder="Your name"
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="settings-input"
                  style={{ paddingLeft: "2.75rem" }}
                  placeholder="you@example.com"
                />
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadOnlyCard
                icon={<ShieldCheck size={16} />}
                label="Role"
                value={formatRole(user?.role || "")}
              />

              <ReadOnlyCard
                icon={<LockKeyhole size={16} />}
                label="Last Login"
                value={formatDateTime(user?.lastLoginAt)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <KeyRound size={19} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Change Password
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Confirm your current password before setting a
                new one.
              </p>
            </div>
          </div>

          {passwordError && (
            <Alert
              className="mt-5"
              type="error"
              message={passwordError}
            />
          )}

          {passwordSuccess && (
            <Alert
              className="mt-5"
              type="success"
              message={passwordSuccess}
            />
          )}

          <div className="mt-6 space-y-5">
            <PasswordField
              label="Current Password"
              value={password.currentPassword}
              show={showCurrentPassword}
              onToggle={() =>
                setShowCurrentPassword((current) => !current)
              }
              onChange={(value) =>
                setPassword((current) => ({
                  ...current,
                  currentPassword: value,
                }))
              }
            />

            <PasswordField
              label="New Password"
              value={password.newPassword}
              show={showNewPassword}
              onToggle={() =>
                setShowNewPassword((current) => !current)
              }
              onChange={(value) =>
                setPassword((current) => ({
                  ...current,
                  newPassword: value,
                }))
              }
            />

            <PasswordField
              label="Confirm New Password"
              value={password.confirmPassword}
              show={showConfirmPassword}
              onToggle={() =>
                setShowConfirmPassword((current) => !current)
              }
              onChange={(value) =>
                setPassword((current) => ({
                  ...current,
                  confirmPassword: value,
                }))
              }
            />

            <p className="text-xs leading-5 text-slate-400">
              Use at least 8 characters. The new password must
              be different from your current password.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={changePassword}
              disabled={savingPassword}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {savingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  Change Password
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .settings-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: #fff;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 0.15s ease;
        }

        .settings-input:focus {
          border-color: rgb(148 163 184);
        }

        .settings-input::placeholder {
          color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      {children}
    </div>
  );
}

function PasswordField({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <KeyRound
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="settings-input"
          style={{
            paddingLeft: "2.75rem",
            paddingRight: "2.75rem",
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}

function ReadOnlyCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function Alert({
  type,
  message,
  className = "",
}: {
  type: "error" | "success";
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        {type === "success" && (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
