"use client";

import Link from "next/link";

import {
  LayoutDashboard,
  Car,
  Map,
  Calendar,
  Users,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Dispatch",
    href: "/dashboard/dispatch",
    icon: Calendar,
  },

  {
    label: "Drivers",
    href: "/dashboard/drivers",
    icon: Car,
  },

  {
    label: "Live Map",
    href: "/dashboard/map",
    icon: Map,
  },

  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },

  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <aside className="w-72 bg-black text-white flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <h1 className="text-3xl font-bold">5AB Ops</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition"
            >
              <Icon size={20} />

              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
