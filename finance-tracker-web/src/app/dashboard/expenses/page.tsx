"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const CATEGORIAS = [
    "🍔 Comida y Bebida",
    "🚕 Transporte",
    "🏠 Vivienda",
    "👕 Compras Personales",
    "💊 Salud",
    "🎉 Ocio y Entretenimiento",
    "📚 Educación",
    "💼 Trabajo / Negocio",
    "🎁 Otros"
];

type Gasto = {
  id: number;
  created_at: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
}

export default function ExpensesPage() {
  const [category, setCategory] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("PEN")
  const [date, setDate] = useState<Date | undefined>(new Date())
  // Removed note field for WhatsApp parity
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [expenses, setExpenses] = useState<Gasto[]>([])
  const [refetch, setRefetch] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
        
        if (error) {
          console.error(error)
        } else {
          setExpenses(data)
        }
      }
    }
    fetchExpenses()
  }, [supabase, refetch])

  useEffect(() => {
    const channel = supabase.channel('realtime-expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, 
        (payload) => {
            console.log('Change received!', payload)
            setRefetch(prev => !prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [supabase]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!category || !amount || !date) {
      setError("Por favor, completa todos los campos requeridos.")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError("Debes iniciar sesión para agregar un gasto.")
      return
    }

    const { error } = await supabase
      .from('expenses')
      .insert({ 
        user_id: user.id, 
        amount: parseFloat(amount), 
        currency, 
        category,
        date: date.toISOString(),
      });

    if (error) {
      setError(error.message)
    } else {
      setSuccess("¡Gasto agregado correctamente!")
      setRefetch(!refetch) // Trigger refetch
      // Clear form
      setCategory("")
      setAmount("")
      setCurrency("PEN")
      setDate(new Date())
    }
  }
  
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'PEN' ? 'S/' : '$';
    return `${symbol} ${amount.toFixed(2)}`;
  }

  return (
    <div className="space-y-6">
      <Card className="text-base">
        <CardHeader className="bg-primary/10 rounded-t-2xl">
          <CardTitle className="text-foreground">Agregar Gasto</CardTitle>
          <CardDescription>
            Completa los detalles para registrar un nuevo gasto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddExpense} className="grid gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría</Label>
                <Select onValueChange={setCategory} value={category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 text-base"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select onValueChange={setCurrency} value={currency}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Elige una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">PEN (Soles)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "h-12 w-full justify-start text-left font-normal text-base",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}
            <Button type="submit" className="h-12 text-base bg-primary text-white hover:bg-primary/90">Agregar Gasto</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="bg-primary/10 rounded-t-2xl">
          <CardTitle className="text-foreground">Gastos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length > 0 ? expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.date), "PPP", { locale: es })}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{formatCurrency(expense.amount, expense.currency)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Todavía no has registrado ningún gasto.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
