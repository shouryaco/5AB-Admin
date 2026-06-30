"use client";

import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import ProtectedRoute from "@/components/protected-route";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <Topbar />

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
