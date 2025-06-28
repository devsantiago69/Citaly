import { useEffect, useState } from "react";
import { Calendar, Clock, Users, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { api } from "../config/api";

interface Stats {
  todayAppointments: { value: number; change: string };
  pendingAppointments: { value: number; change: string };
  completedAppointments: { value: number; change: string };
  todayRevenue: { value: string; change: string };
  monthlyRevenue: { value: string; change: string };
  cancelledAppointments: { value: number; change: string };
}

interface AppointmentStatusCount {
  status: string;
  count: number;
}

const StatsCards = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Get today's date and first day of month
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        const monthStart = firstDayOfMonth.toISOString().split('T')[0];
        if (!monthStart || !today) {
          setError('Fechas inválidas para stats');
          setLoading(false);
          return;
        }
        // Llamar al nuevo endpoint
        const response = await api.get('/api/appointments/stats', {
          params: {
            start_date: monthStart,
            end_date: today
          }
        });
        // Procesar los datos recibidos
        const statsData: AppointmentStatusCount[] = Array.isArray(response) ? response : [];
        // Mapear los estados a variables
        const getCount = (status: string) => {
          const found = statsData.find(s => (s.status || '').toLowerCase() === status);
          return found ? Number(found.count) : 0;
        };
        // Asignar valores
        const completed = getCount('completada');
        const pending = getCount('pendiente') + getCount('programada') + getCount('in_progress') + getCount('scheduled') + getCount('confirmed');
        const cancelled = getCount('cancelada') + getCount('cancelled');
        const total = completed + pending + cancelled;
        // Simular ingresos (si no hay campo revenue)
        const todayRevenue = 0;
        const monthlyRevenue = 0;
        // Cambios respecto a promedio diario
        const daysInMonth = 1;
        const dailyAverage = {
          appointments: total / daysInMonth,
          completed: completed / daysInMonth,
          pending: pending / daysInMonth,
          cancelled: cancelled / daysInMonth,
          revenue: 0
        };
        const calculateChange = (current: number, average: number) => {
          if (average === 0) return "0%";
          const change = ((current - average) / average) * 100;
          return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        };
        setStats({
          todayAppointments: {
            value: total,
            change: calculateChange(total, dailyAverage.appointments)
          },
          pendingAppointments: {
            value: pending,
            change: calculateChange(pending, dailyAverage.pending)
          },
          completedAppointments: {
            value: completed,
            change: calculateChange(completed, dailyAverage.completed)
          },
          todayRevenue: {
            value: `$${todayRevenue.toLocaleString()}`,
            change: calculateChange(todayRevenue, dailyAverage.revenue)
          },
          monthlyRevenue: {
            value: `$${monthlyRevenue.toLocaleString()}`,
            change: `${((completed / (total || 1)) * 100).toFixed(1)}% completadas`
          },
          cancelledAppointments: {
            value: cancelled,
            change: calculateChange(cancelled, dailyAverage.cancelled)
          }
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(null); // No mostrar error visual, solo dejar los valores en cero
        setStats({
          todayAppointments: { value: 0, change: '0%' },
          pendingAppointments: { value: 0, change: '0%' },
          completedAppointments: { value: 0, change: '0%' },
          todayRevenue: { value: '$0', change: '0%' },
          monthlyRevenue: { value: '$0', change: '0%' },
          cancelledAppointments: { value: 0, change: '0%' }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statsConfig = [
    {
      title: "Citas Hoy",
      getValue: (data: Stats) => String(data.todayAppointments.value),
      getChange: (data: Stats) => data.todayAppointments.change,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Citas Pendientes",
      getValue: (data: Stats) => String(data.pendingAppointments.value),
      getChange: (data: Stats) => data.pendingAppointments.change,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Clientes Atendidos",
      getValue: (data: Stats) => String(data.completedAppointments.value),
      getChange: (data: Stats) => data.completedAppointments.change,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Ingresos del Día",
      getValue: (data: Stats) => data.todayRevenue.value,
      getChange: (data: Stats) => data.todayRevenue.change,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Ingresos del Mes",
      getValue: (data: Stats) => data.monthlyRevenue.value,
      getChange: (data: Stats) => data.monthlyRevenue.change,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Citas Canceladas",
      getValue: (data: Stats) => String(data.cancelledAppointments.value),
      getChange: (data: Stats) => data.cancelledAppointments.change,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="w-8 h-8 rounded-lg bg-gray-200"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statsConfig.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stat.getValue(stats) : '-'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats ? stat.getChange(stats) : '-'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
