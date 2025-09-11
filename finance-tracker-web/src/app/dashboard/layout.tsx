import Link from "next/link"
import {
  CircleUser,
  Home,
  LineChart,
  Menu,
  Package,
  Package2,
  Users,
  Settings,
  LogOut,
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
import { NavLinks } from "./NavLinks"

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

  const userName = user.user_metadata?.name || user.email;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r md:block bg-gradient-to-b from-green-50 to-white">
        <div className="flex h-full max-h-screen flex-col gap-2 sticky top-0">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
              <Package2 className="h-6 w-6 text-green-700" />
              <span className="">Finanzas Personales</span>
            </Link>
          </div>
          <div className="flex-1">
            <NavLinks />
          </div>
          <div className="mt-auto p-4">
            <div className="p-4 rounded-lg bg-green-100/60">
              <div className="flex items-center gap-3">
                <CircleUser className="h-8 w-8 text-green-800" />
                <div>
                  <p className="font-semibold text-green-900">{userName}</p>
                </div>
              </div>
              <div className="grid gap-2 mt-4">
                  <Button variant="ghost" className="justify-start gap-3 text-foreground/80 hover:text-foreground">
                    <Settings className="h-5 w-5" />
                    Configuración
                  </Button>
                  <form action="/auth/signout" method="post" className="w-full">
                    <Button type="submit" variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600">
                      <LogOut className="h-5 w-5" />
                      Cerrar Sesión
                    </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6">
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
            <SheetContent side="left" className="flex flex-col bg-gradient-to-b from-green-50 to-white">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Package2 className="h-6 w-6 text-green-700" />
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
        <main className="flex flex-1 flex-col gap-6 p-4 lg:gap-8 lg:p-8 bg-gray-50/50">
          <div className="container max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

