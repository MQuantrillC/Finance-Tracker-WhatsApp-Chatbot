import Link from "next/link"
import {
  CircleUser,
  Home,
  LineChart,
  Menu,
  Package,
  Package2,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r md:block bg-gradient-to-b from-[#E8F5E9] to-[#F7F6F2]">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
              <Package2 className="h-6 w-6 text-[#2F5D50]" />
              <span className="">Finanzas Personales</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/expenses"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Package className="h-4 w-4" />
                Gastos
              </Link>
              <Link
                href="/dashboard/budgets"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Users className="h-4 w-4" />
                Presupuestos
              </Link>
              <Link
                href="/dashboard/analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 hover:text-foreground transition-colors"
              >
                <LineChart className="h-4 w-4" />
                Análisis
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-secondary px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú de navegación</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-gradient-to-b from-[#E8F5E9] to-[#F7F6F2]">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Package2 className="h-6 w-6" />
                  <span className="sr-only">Finanzas Personales</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-foreground/70 hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/expenses"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-foreground/70 hover:text-foreground"
                >
                  <Package className="h-5 w-5" />
                  Gastos
                </Link>
                <Link
                  href="/dashboard/budgets"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-foreground/70 hover:text-foreground"
                >
                  <Users className="h-5 w-5" />
                  Presupuestos
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-foreground/70 hover:text-foreground"
                >
                  <LineChart className="h-5 w-5" />
                  Análisis
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Espacio para futura barra de búsqueda */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Menú de usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Configuración</DropdownMenuItem>
              <DropdownMenuItem>Soporte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action="/auth/signout" method="post">
                <button type="submit" className="w-full text-left">
                  <DropdownMenuItem>Cerrar Sesión</DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 lg:gap-8 lg:p-8">
          <div className="container max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

