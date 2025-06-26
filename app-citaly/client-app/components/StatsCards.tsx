import { useEffect, useState } from "react";
import { Calendar, Clock, Users, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/config/api";

interface Stats {
  todayAppointments: { value: number; change: string };
  pendingAppointments: { value: number; change: string };
  completedAppointments: { value: number; change: string };
  todayRevenue: { value: string; change: string };
  monthlyRevenue: { value: string; change: string };
  cancelledAppointments: { value: number; change: string };
}

interface AppointmentStats {
  date: string;
  total_appointments: number;
  completed: number;
  pending: number;
  cancelled: number;
  total_revenue: number;
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
        // Validar fechas antes de llamar a la API
        if (!monthStart || !today) {
          setError('Fechas inválidas para stats');
          setLoading(false);
          return;
        }
        // Get stats for current month
        const response = await api.get('/api/appointments/stats', {
          params: {
            start_date: monthStart,
            end_date: today
          }
        });

        // Process the stats data
        const statsData = Array.isArray(response) ? response : [];
        
        // Get today's stats
        const todayStats = statsData.find((s: AppointmentStats) => s.date === today) || {
          total_appointments: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          total_revenue: 0
        };

        // Calculate month totals
        const monthTotals = statsData.reduce((acc: any, curr: AppointmentStats) => ({
          total_appointments: acc.total_appointments + curr.total_appointments,
          completed: acc.completed + curr.completed,
          pending: acc.pending + curr.pending,
          cancelled: acc.cancelled + curr.cancelled,
          total_revenue: acc.total_revenue + curr.total_revenue
        }), {
          total_appointments: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          total_revenue: 0
        });

        // Calculate changes (comparing to monthly average)
        const daysInMonth = statsData.length || 1;
        const dailyAverage = {
          appointments: monthTotals.total_appointments / daysInMonth,
          completed: monthTotals.completed / daysInMonth,
          pending: monthTotals.pending / daysInMonth,
          cancelled: monthTotals.cancelled / daysInMonth,
          revenue: monthTotals.total_revenue / daysInMonth
        };

        const calculateChange = (current: number, average: number) => {
          if (average === 0) return "0%";
          const change = ((current - average) / average) * 100;
          return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        };

        setStats({
          todayAppointments: {
            value: todayStats.total_appointments,
            change: calculateChange(todayStats.total_appointments, dailyAverage.appointments)
          },
          pendingAppointments: {
            value: todayStats.pending,
            change: calculateChange(todayStats.pending, dailyAverage.pending)
          },
          completedAppointments: {
            value: todayStats.completed,
            change: calculateChange(todayStats.completed, dailyAverage.completed)
          },
          todayRevenue: {
            value: `$${todayStats.total_revenue.toLocaleString()}`,
            change: calculateChange(todayStats.total_revenue, dailyAverage.revenue)
          },
          monthlyRevenue: {
            value: `$${monthTotals.total_revenue.toLocaleString()}`,
            change: `${((monthTotals.completed / (monthTotals.total_appointments || 1)) * 100).toFixed(1)}% completadas`
          },
          cancelledAppointments: {
            value: todayStats.cancelled,
            change: calculateChange(todayStats.cancelled, dailyAverage.cancelled)
          }
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err instanceof Error ? err.message : 'Error fetching stats');
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
