import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { api } from "../config/api";
import { Calendar, Clock, Users, AlertTriangle, CalendarDays, TrendingUp, BadgeCheck, CalendarClock, CheckCircle, XCircle, HelpCircle } from "lucide-react";

const StatsCards = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Llamar al endpoint SIN filtros de fecha
        const response = await api.get('/api/appointments/stats');
        console.log('[StatsCards] Response:', response);
        if (response && response.success && response.data) {
          setStats(response.data);
        } else {
          setStats(null);
          setError('No se pudo obtener la información de estadísticas');
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Error al obtener estadísticas');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Configuración de iconos y colores para campos comunes
  const iconMap: Record<string, { icon: React.ReactNode, bg: string }> = {
    hoy: { icon: <CalendarDays className="h-5 w-5 text-purple-600" />, bg: "bg-purple-50" },
    programadas: { icon: <Clock className="h-5 w-5 text-yellow-600" />, bg: "bg-yellow-50" },
    completadas: { icon: <CheckCircle className="h-5 w-5 text-green-600" />, bg: "bg-green-50" },
    canceladas: { icon: <XCircle className="h-5 w-5 text-red-600" />, bg: "bg-red-50" },
    confirmadas: { icon: <BadgeCheck className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50" },
    total_citas: { icon: <Calendar className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50" },
    este_mes: { icon: <TrendingUp className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-50" },
    esta_semana: { icon: <CalendarClock className="h-5 w-5 text-orange-600" />, bg: "bg-orange-50" },
    usuarios: { icon: <Users className="h-5 w-5 text-green-600" />, bg: "bg-green-50" },
    otros: { icon: <HelpCircle className="h-5 w-5 text-gray-400" />, bg: "bg-gray-50" },
  };

  // Lista de campos a mostrar primero (orden y nombres amigables)
  const fieldOrder: { key: string, label: string }[] = [
    { key: 'hoy', label: 'Citas Hoy' },
    { key: 'programadas', label: 'Citas Programadas' },
    { key: 'completadas', label: 'Citas Completadas' },
    { key: 'canceladas', label: 'Citas Canceladas' },
    { key: 'confirmadas', label: 'Citas Confirmadas' },
    { key: 'total_citas', label: 'Total Citas' },
    { key: 'este_mes', label: 'Citas Este Mes' },
    { key: 'esta_semana', label: 'Citas Esta Semana' },
  ];

  // Render directo de los datos tal como vienen del API
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

  if (!stats) {
    return <div className="p-4 text-gray-500">No hay datos de estadísticas.</div>;
  }

  // Render con IU moderna y ordenada
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {fieldOrder.filter(f => stats[f.key] !== undefined).map((f, idx) => (
        <Card key={f.key} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{f.label}</CardTitle>
            <span className={`shrink-0 rounded-lg p-2 ${iconMap[f.key]?.bg || iconMap.otros.bg}`}>{iconMap[f.key]?.icon || iconMap.otros.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{String(stats[f.key])}</div>
          </CardContent>
        </Card>
      ))}
      {/* Mostrar cualquier campo adicional no listado arriba */}
      {Object.entries(stats).filter(([key]) => !fieldOrder.some(f => f.key === key)).map(([key, value]) => (
        <Card key={key} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</CardTitle>
            <span className={`shrink-0 rounded-lg p-2 ${iconMap[key]?.bg || iconMap.otros.bg}`}>{iconMap[key]?.icon || iconMap.otros.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{String(value)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
