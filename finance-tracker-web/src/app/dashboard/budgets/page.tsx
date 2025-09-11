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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { startOfMonth, startOfWeek } from 'date-fns'

const CATEGORIAS = [
    "🍔 Comida y Bebida", "🚕 Transporte", "🏠 Vivienda", "👕 Compras Personales", 
    "💊 Salud", "🎉 Ocio y Entretenimiento", "📚 Educación", "💼 Trabajo / Negocio", "🎁 Otros"
];

type Presupuesto = {
  id: number;
  category: string;
  amount: number;
  period: string;
  spent: number;
  progress: number;
}

type Perfil = {
    ingreso_mensual: number;
}

export default function BudgetsPage() {
  const [category, setCategory] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [period, setPeriod] = useState<string>("monthly")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [incomeSuccess, setIncomeSuccess] = useState<string | null>(null);
  
  const [budgets, setBudgets] = useState<Presupuesto[]>([])
  const [refetch, setRefetch] = useState(false)
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  
  const supabase = createClient()

  useEffect(() => {
    const fetchBudgetsAndExpenses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch profile for income
        const { data: profileData } = await supabase.from('profiles').select('ingreso_mensual').eq('id', user.id).single();
        if (profileData) {
            setMonthlyIncome(profileData.ingreso_mensual?.toString() || "");
        }

        // Fetch budgets
        const { data: budgetsData, error: budgetsError } = await supabase.from('budgets').select('*').eq('user_id', user.id)
        if (budgetsError) { console.error(budgetsError); return }

        // Fetch expenses
        const now = new Date()
        const monthStart = startOfMonth(now).toISOString()
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
        const { data: expensesData, error: expensesError } = await supabase.from('expenses').select('category, amount, date, currency').eq('user_id', user.id).gte('date', budgetsData.some(b => b.period === 'weekly') ? weekStart : monthStart)
        if (expensesError) { console.error(expensesError); return }

        // Calculate spent amount
        const processedBudgets = budgetsData.map(budget => {
          const startDate = budget.period === 'monthly' ? startOfMonth(now) : startOfWeek(now, { weekStartsOn: 1 });
          const spent = expensesData.filter(e => e.category === budget.category && new Date(e.date) >= startDate).reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * 3.8 : e.amount), 0)
          return { ...budget, spent, progress: (spent / budget.amount) * 100 }
        })
        setBudgets(processedBudgets)
      }
    }
    fetchBudgetsAndExpenses()
  }, [supabase, refetch])

  useEffect(() => {
    const channel = supabase.channel('realtime-budgets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => {
        setRefetch(prev => !prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        setRefetch(prev => !prev);
      })
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    }
  }, [supabase]);

  const handleUpdateIncome = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { error } = await supabase.from('profiles').update({ ingreso_mensual: parseFloat(monthlyIncome) }).eq('id', user.id);
        if (error) { console.error(error) } 
        else {
            setIncomeSuccess("¡Ingreso actualizado!");
            setTimeout(() => setIncomeSuccess(null), 3000);
        }
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!category || !amount) { setError("Por favor, completa todos los campos."); return }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Debes iniciar sesión para agregar un presupuesto."); return }

    const { error } = await supabase.from('budgets').insert({ user_id: user.id, amount: parseFloat(amount), category, period });
    if (error) { setError(error.message) } 
    else {
      setSuccess("¡Presupuesto agregado correctamente!");
      setRefetch(!refetch);
      setCategory(""); setAmount(""); setPeriod("monthly");
    }
  }
  
  const formatCurrency = (amount: number) => `S/ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-primary/10 rounded-t-2xl"><CardTitle className="text-foreground">Mis Ingresos</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
            <Label htmlFor="income">Ingreso Mensual (PEN)</Label>
            <Input id="income" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} className="w-48" />
            <Button onClick={handleUpdateIncome} className="bg-primary text-white hover:bg-primary/90">Guardar</Button>
            {incomeSuccess && <p className="text-green-500 text-sm">{incomeSuccess}</p>}
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-primary/10 rounded-t-2xl"><CardTitle className="text-foreground">Agregar Presupuesto</CardTitle><CardDescription>Define un nuevo presupuesto para una categoría.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleAddBudget} className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="category">Categoría</Label><Select onValueChange={setCategory} value={category}><SelectTrigger><SelectValue placeholder="Elige una categoría" /></SelectTrigger><SelectContent>{CATEGORIAS.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="amount">Monto (en PEN)</Label><Input id="amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="period">Periodo</Label><Select onValueChange={setPeriod} value={period}><SelectTrigger><SelectValue placeholder="Elige un periodo" /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensual</SelectItem><SelectItem value="weekly">Semanal</SelectItem></SelectContent></Select></div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-500 text-sm">{success}</p>}
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90">Agregar Presupuesto</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="bg-primary/10 rounded-t-2xl"><CardTitle className="text-foreground">Tus Presupuestos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead>Presupuesto</TableHead><TableHead>Gastado</TableHead><TableHead>Restante</TableHead><TableHead>Progreso</TableHead></TableRow></TableHeader>
              <TableBody>
                {budgets.length > 0 ? budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell>{budget.category}</TableCell>
                    <TableCell>{formatCurrency(budget.amount)}</TableCell>
                    <TableCell>{formatCurrency(budget.spent)}</TableCell>
                    <TableCell>{formatCurrency(budget.amount - budget.spent)}</TableCell>
                    <TableCell><Progress value={budget.progress} className="w-full"/></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="text-center">Aún no has creado ningún presupuesto.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
