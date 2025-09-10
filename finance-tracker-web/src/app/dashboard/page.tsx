"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type Gasto = {
  category: string;
  amount: number;
  date: string;
  currency: string;
}

type Presupuesto = {
  category: string;
  amount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const PlaceholderCard = ({ title, message }: { title: string; message: string }) => (
    <Card className="lg:col-span-1 flex items-center justify-center h-[350px]">
        <div className="text-center">
            <CardTitle>{title}</CardTitle>
            <p className="text-muted-foreground mt-2">{message}</p>
        </div>
    </Card>
);

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Gasto[]>([])
  const [budgets, setBudgets] = useState<Presupuesto[]>([])
  const [refetch, setRefetch] = useState(false);
  
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch expenses
        const { data: expensesData } = await supabase.from('expenses').select('category, amount, date, currency').eq('user_id', user.id)
        setExpenses(expensesData || [])

        // Fetch budgets
        const { data: budgetsData } = await supabase.from('budgets').select('category, amount').eq('user_id', user.id)
        setBudgets(budgetsData || [])
      }
    }
    fetchData()
  }, [supabase, refetch])

  useEffect(() => {
    const channel = supabase.channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        setRefetch(prev => !prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => {
        setRefetch(prev => !prev);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [supabase]);

  // Process data for charts
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const amountInPEN = expense.currency === 'USD' ? expense.amount * 3.8 : expense.amount;
    const existing = acc.find(item => item.name === expense.category)
    if (existing) {
      existing.value += amountInPEN
    } else {
      acc.push({ name: expense.category, value: amountInPEN })
    }
    return acc
  }, [] as { name: string; value: number }[])

  const monthlySpending = expenses.reduce((acc, expense) => {
    const month = new Date(expense.date).toLocaleString('es-ES', { month: 'short' });
    const amountInPEN = expense.currency === 'USD' ? expense.amount * 3.8 : expense.amount;
    const existing = acc.find(item => item.month === month)
    if (existing) {
      existing.amount += amountInPEN
    } else {
      acc.push({ month, amount: amountInPEN })
    }
    return acc
  }, [] as { month: string; amount: number }[]).reverse()

  const budgetVsActual = budgets.map(budget => {
    const spent = expenses
      .filter(expense => expense.category === budget.category)
      .reduce((sum, expense) => {
        const amountInPEN = expense.currency === 'USD' ? expense.amount * 3.8 : expense.amount;
        return sum + amountInPEN
      }, 0)
    return {
      category: budget.category,
      presupuesto: budget.amount,
      gastado: spent,
    }
  })

  return (
    <div className="grid gap-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <Button asChild className="bg-primary text-white hover:bg-primary/90">
                <Link href="/dashboard/expenses">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Nuevo Gasto
                </Link>
            </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {expenses.length > 0 ? (
                <Card className="lg:col-span-1">
                    <CardHeader className="bg-primary/10 rounded-t-2xl">
                    <CardTitle className="text-foreground">Gastos por Categoría</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                        <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(((percent ?? 0) * 100).toFixed(0))}%`}
                        >
                            {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                        </PieChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
            ) : (
                <PlaceholderCard title="Gastos por Categoría" message="Aún no tienes gastos registrados. ¡Agrega uno para ver tu análisis!" />
            )}
            
            {expenses.length > 0 ? (
                <Card className="lg:col-span-2">
                    <CardHeader className="bg-primary/10 rounded-t-2xl">
                    <CardTitle className="text-foreground">Evolución de Gastos Mensuales</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlySpending}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                        <XAxis dataKey="month" stroke="#2F5D50" tick={{ fill: '#2F5D50' }} />
                        <YAxis tickFormatter={(value) => `S/ ${value}`} stroke="#2F5D50" tick={{ fill: '#2F5D50' }} />
                        <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="amount" name="Gastado" stroke="#3BA776" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
            ) : (
                <PlaceholderCard title="Evolución de Gastos" message="Registra gastos para ver tu evolución mensual aquí." />
            )}

            {budgets.length > 0 ? (
                <Card className="lg:col-span-3">
                    <CardHeader className="bg-primary/10 rounded-t-2xl">
                    <CardTitle className="text-foreground">Presupuesto vs. Gasto Real</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={budgetVsActual}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                        <XAxis dataKey="category" stroke="#2F5D50" tick={{ fill: '#2F5D50' }} />
                        <YAxis tickFormatter={(value) => `S/ ${value}`} stroke="#2F5D50" tick={{ fill: '#2F5D50' }} />
                        <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="presupuesto" fill="#3BA776" radius={[8,8,0,0]} />
                        <Bar dataKey="gastado" fill="#2F5D50" radius={[8,8,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
            ) : (
                <PlaceholderCard title="Presupuesto vs. Gasto Real" message="Define un presupuesto para comparar tus gastos." />
            )}
        </div>
    </div>
  )
}
