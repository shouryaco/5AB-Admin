"use client";

import { Bell, Search, LogOut } from "lucide-react";

import { logout } from "@/lib/auth";

export default function Topbar() {
  return (
    <header className="h-20 bg-white border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl w-[400px]">
        <Search size={18} />

        <input
          placeholder="Search bookings, drivers..."
          className="bg-transparent outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative">
          <Bell size={22} />

          <span className="absolute -top-2 -right-2 w-5 h-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </header>
  );
}
