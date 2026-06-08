"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import {
  Bell,
  Database,
  FileText,
  LayoutDashboard,
  Monitor,
  Settings,
  Ticket,
  Bug,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Ativos",
    href: "/assets",
    icon: Monitor,
  },
  {
    label: "Alertas",
    href: "/alerts",
    icon: Bell,
  },
  {
    label: "Suporte",
    href: "/tickets",
    icon: Ticket,
  },
  {
    label: "Relatórios",
    href: "/reports",
    icon: FileText,
  },
  {
    label: "Configurações",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Admin",
    href: "/admin/tenants",
    icon: Database,
  },
  {
  label: "Vulnerabilidades",
  href: "/vulnerabilities",
  icon: Bug,
  roles: ["TENANT_ADMIN", "TENANT_USER", "READ_ONLY"],
  },
];

type PortalSidebarNavProps = {
  userRole?: UserRole;
};

export function PortalSidebarNav({ userRole }: PortalSidebarNavProps) {
  const pathname = usePathname();

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.href.startsWith("/admin")) {
      return userRole === "PARTSEC_ADMIN";
    }

    return true;
  });

  return (
    <nav className="flex-1 space-y-1 px-4 py-6">
      {visibleMenuItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
              isActive
                ? "bg-white text-[#071426] shadow-sm"
                : "text-slate-200 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Icon
              className={[
                "h-5 w-5",
                isActive ? "text-[#071426]" : "text-slate-300",
              ].join(" ")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
