"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Car,
  Map,
  Calendar,
  Users,
  Settings,
  FileText,
} from "lucide-react";

import api from "@/lib/api";

type UserRole = "ADMIN" | "DISPATCHER" | "DRIVER";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

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
    label: "Finance",
    href: "/dashboard/finance",
    icon: FileText,
    adminOnly: true,
  },

  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      try {
        const response = await api.get<CurrentUser>("/auth/me");

        if (mounted) {
          setRole(response.data.role);
        }
      } catch (error) {
        console.error("Unable to load current user:", error);

        if (mounted) {
          setRole(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && role !== "ADMIN") {
      return false;
    }

    return true;
  });

  return (
    <aside className="w-72 bg-black text-white flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <h1 className="text-3xl font-bold">5AB Ops</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                active ? "bg-white text-black" : "text-white hover:bg-white/10"
              }`}
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
