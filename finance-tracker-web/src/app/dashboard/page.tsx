"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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

const COLORS = ['#166534', '#22c55e', '#86efac', '#dcfce7', '#a7f3d0', '#6ee7b7'];

interface CustomPieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: CustomPieLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#15803d"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};


const PlaceholderCard = ({ title, message }: { title: string; message: string }) => (
    <Card className="lg:col-span-1 flex items-center justify-center h-[350px] shadow-sm">
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
  const [userName, setUserName] = useState<string>('');
  const [activeRange, setActiveRange] = useState<string>('this_month');
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email || '');
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

  const setDateRange = (range: 'week' | 'this_month' | 'last_month' | 'last_6_months' | 'this_year' | 'last_year') => {
    const today = new Date();
    let fromDate;
    setActiveRange(range);

    switch (range) {
        case 'week':
            fromDate = addDays(today, -today.getDay());
            break;
        case 'this_month':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'last_month':
            fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            break;
        case 'last_6_months':
            fromDate = addDays(today, -180);
            break;
        case 'this_year':
            fromDate = new Date(today.getFullYear(), 0, 1);
            break;
        case 'last_year':
            fromDate = new Date(today.getFullYear() - 1, 0, 1);
            break;
    }
    setDate({ from: fromDate, to: today });
  };

  const filteredExpenses = expenses.filter(expense => {
    if (!date?.from || !date?.to) return true;
    const expenseDate = new Date(expense.date);
    return expenseDate >= date.from && expenseDate <= date.to;
  });

  // Process data for charts
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    const amountInPEN = expense.currency === 'USD' ? expense.amount * 3.8 : expense.amount;
    const existing = acc.find(item => item.name === expense.category)
    if (existing) {
      existing.value += amountInPEN
    } else {
      acc.push({ name: expense.category, value: amountInPEN })
    }
    return acc
  }, [] as { name: string; value: number }[])

  const monthlySpending = filteredExpenses.reduce((acc, expense) => {
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
    const spent = filteredExpenses
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

  const totalFilteredSpent = filteredExpenses.reduce((sum, expense) => {
    const amountInPEN = expense.currency === 'USD' ? expense.amount * 3.8 : expense.amount;
    return sum + amountInPEN;
  }, 0);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bienvenido de vuelta, {userName}</h1>
        <p className="text-muted-foreground">Aquí tienes un resumen de tus finanzas.</p>
      </div>
      <div className="grid gap-6">
        {expenses.length > 0 ? (
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between p-6">
              <CardTitle className="text-foreground text-xl font-semibold">Gastos por Categoría</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant={activeRange === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('week')} className={activeRange === 'week' ? 'bg-green-700' : ''}>Semana</Button>
                <Button variant={activeRange === 'this_month' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('this_month')} className={activeRange === 'this_month' ? 'bg-green-700' : ''}>Este Mes</Button>
                <Button variant={activeRange === 'last_6_months' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('last_6_months')} className={activeRange === 'last_6_months' ? 'bg-green-700' : ''}>6 Meses</Button>
                <Button variant={activeRange === 'this_year' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('this_year')} className={activeRange === 'this_year' ? 'bg-green-700' : ''}>Este Año</Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={CustomPieLabel}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesByCategory.map((expense) => (
                        <TableRow key={expense.name}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell className="text-right">S/ {expense.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PlaceholderCard title="Gastos por Categoría" message="Aún no tienes gastos registrados. ¡Agrega uno para ver tu análisis!" />
        )}

        {expenses.length > 0 ? (
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between p-6">
              <CardTitle className="text-foreground text-xl font-semibold">Evolución de Gastos Mensuales</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant={activeRange === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('week')} className={activeRange === 'week' ? 'bg-green-700' : ''}>Semana</Button>
                <Button variant={activeRange === 'this_month' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('this_month')} className={activeRange === 'this_month' ? 'bg-green-700' : ''}>Este Mes</Button>
                <Button variant={activeRange === 'last_6_months' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('last_6_months')} className={activeRange === 'last_6_months' ? 'bg-green-700' : ''}>6 Meses</Button>
                <Button variant={activeRange === 'this_year' ? 'default' : 'outline'} size="sm" onClick={() => setDateRange('this_year')} className={activeRange === 'this_year' ? 'bg-green-700' : ''}>Este Año</Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2">
                  <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlySpending}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                      <XAxis dataKey="month" stroke="#166534" tick={{ fill: '#166534' }} />
                      <YAxis tickFormatter={(value) => `S/ ${value}`} stroke="#166534" tick={{ fill: '#166534' }} />
                      <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                      <Line type="monotone" dataKey="amount" name="Gastado" stroke="#22c55e" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Gasto Total</p>
                  <p className="text-3xl font-bold text-primary">S/ {totalFilteredSpent.toFixed(2)}</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Total gastado en el período seleccionado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PlaceholderCard title="Evolución de Gastos" message="Registra gastos para ver tu evolución mensual aquí." />
        )}

        {budgets.length > 0 ? (
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="p-6">
              <CardTitle className="text-foreground text-xl font-semibold">Presupuesto vs. Gasto Real</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetVsActual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                  <XAxis dataKey="category" stroke="#166534" tick={{ fill: '#166534' }} />
                  <YAxis tickFormatter={(value) => `S/ ${value}`} stroke="#166534" tick={{ fill: '#166534' }} />
                  <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                  <Bar dataKey="presupuesto" fill="#22c55e" radius={[8,8,0,0]} />
                  <Bar dataKey="gastado" fill="#166534" radius={[8,8,0,0]} />
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
