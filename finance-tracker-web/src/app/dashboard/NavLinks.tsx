'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, Users, LineChart } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavLinks() {
  const pathname = usePathname()

  const links = [
    { href: "/dashboard", icon: Home, text: "Dashboard" },
    { href: "/dashboard/expenses", icon: Package, text: "Gastos" },
    { href: "/dashboard/budgets", icon: Users, text: "Presupuestos" },
    { href: "/dashboard/analytics", icon: LineChart, text: "Análisis" },
  ]

  return (
    <nav className="grid items-start px-2 text-base font-medium lg:px-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-3 text-foreground/70 transition-colors hover:text-foreground",
            pathname === link.href && "bg-green-200/60 text-foreground"
          )}
        >
          <link.icon className="h-5 w-5" />
          {link.text}
        </Link>
      ))}
    </nav>
  )
}
