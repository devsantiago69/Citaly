import { useState, useEffect, useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart as RechartsPieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { 
  TrendingUp, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Users, 
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon, // Alias para el icono
  RefreshCw,
  UserCheck,
  Briefcase
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { DateRange } from "react-day-picker"

// Utilidades para exportación
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Interfaces para tipos de datos
interface ReportOverview {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_revenue: number;
  avg_service_price: number;
  unique_clients: number;
  active_staff: number;
  completion_rate: string;
  cancellation_rate: string;
}

interface RevenueData {
  period: string;
  date: string;
  revenue: number;
}

interface ServiceData {
  service_name: string;
  total_appointments: number;
  total_revenue: number;
}

interface StaffData {
  staff_name: string;
  total_appointments: number;
  total_revenue: number;
  completion_rate: string;
}

interface ClientData {
  client_name: string;
  total_appointments: number;
  total_spent: number;
  last_appointment_date: string;
}

interface MonthlySalesData {
  year: number;
  month: string;
  month_number: number;
  total_revenue: number;
}

const ReportsPanel = () => {
  // Estados para datos
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [servicesData, setServicesData] = useState<ServiceData[]>([]);
  const [staffData, setStaffData] = useState<StaffData[]>([]);
  const [clientsData, setClientsData] = useState<ClientData[]>([]);
  const [monthlySalesData, setMonthlySalesData] = useState<MonthlySalesData[]>([]);

  // Estados para filtros
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subDays(new Date(), 30)),
    to: endOfMonth(new Date())
  });
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const fetchData = async (endpoint: string, params: URLSearchParams) => {
    const response = await fetch(`/api/reports/${endpoint}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Error fetching ${endpoint}`);
    }
    return response.json();
  };

  const loadAllData = async () => {
    if (!dateRange?.from) return;
    setLoading(true);
    const params = new URLSearchParams({
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to || dateRange.from, 'yyyy-MM-dd'),
      period: period,
    });

    try {
      const [overviewData, revenue, services, staff, clients, monthlySales] = await Promise.all([
        fetchData('overview', params),
        fetchData('revenue', params),
        fetchData('services', params),
        fetchData('staff', params),
        fetchData('clients', params),
        fetchData('sales-by-month', params),
      ]);
      setOverview(overviewData);
      setRevenueData(revenue);
      setServicesData(services);
      setStaffData(staff);
      setClientsData(clients);
      setMonthlySalesData(monthlySales);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange?.from) {
      loadAllData();
    }
  }, [dateRange, period]);

  // Funciones de exportación (sin cambios)
  const exportToPDF = (data: any[], title: string, columns: { header: string, dataKey: string }[]) => {
    if (!dateRange?.from) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })}${dateRange.to ? ` - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}` : ''}`, 20, 30);

    (doc as any).autoTable({
      head: [columns.map(c => c.header)],
      body: data.map(item => columns.map(c => item[c.dataKey] ?? '')),
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = (data: any[], title: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToCSV = (data: any[], title: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const chartRevenueData = useMemo(() => revenueData.map(item => ({
    ...item,
    date: format(parseISO(item.date), period === 'daily' ? 'dd/MM' : 'MMM yy', { locale: es }),
  })), [revenueData, period]);

  const chartServicesData = useMemo(() => servicesData.slice(0, 5), [servicesData]);

  const chartStaffData = useMemo(() => staffData.slice(0, 8).map(item => ({
    name: item.staff_name.split(' ')[0],
    Citas: item.total_appointments,
  })), [staffData]);

  const chartMonthlySalesData = useMemo(() => monthlySalesData.map(item => ({
    ...item,
    month: item.month.charAt(0).toUpperCase() + item.month.slice(1),
  })), [monthlySalesData]);

  const PIE_CHART_COLORS = [
    'hsl(var(--chart-1))', 
    'hsl(var(--chart-2))', 
    'hsl(var(--chart-3))', 
    'hsl(var(--chart-4))', 
    'hsl(var(--chart-5))'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Reportes y Análisis
              </CardTitle>
              <CardDescription>
                Análisis detallado del rendimiento de tu negocio.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      {dateRange?.from ? format(dateRange.from, "dd/MM/yy") : "Seleccionar"}
                      {dateRange?.to ? ` - ${format(dateRange.to, "dd/MM/yy")}` : ""}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadAllData} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && <div className="text-center py-8">Cargando reportes...</div>}
      
      {!loading && overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(overview.total_revenue)}</div>
                <p className="text-xs text-muted-foreground">Precio promedio: {formatPrice(overview.avg_service_price)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Citas Totales</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.total_appointments}</div>
                <p className="text-xs text-muted-foreground">{overview.completed_appointments} completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Completado</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.completion_rate}%</div>
                <p className="text-xs text-muted-foreground">Tasa de cancelación: {overview.cancellation_rate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes y Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.unique_clients}</div>
                <p className="text-xs text-muted-foreground">{overview.active_staff} staff activo</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              <TabsTrigger value="revenue"><LineChartIcon className="h-4 w-4 mr-2" />Ingresos</TabsTrigger>
              <TabsTrigger value="monthly-sales"><BarChart3 className="h-4 w-4 mr-2" />Ventas Mensuales</TabsTrigger>
              <TabsTrigger value="services"><PieChart className="h-4 w-4 mr-2" />Servicios</TabsTrigger>
              <TabsTrigger value="staff"><BarChart3 className="h-4 w-4 mr-2" />Staff</TabsTrigger>
              <TabsTrigger value="clients"><Users className="h-4 w-4 mr-2" />Clientes</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue">
              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Ingresos</CardTitle>
                  <CardDescription>Ingresos generados en el período seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ revenue: { label: 'Ingresos', color: 'hsl(var(--chart-1))' } }} className="h-[300px] w-full">
                    <AreaChart data={chartRevenueData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                      <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" stackId="a" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                  <div className="font-semibold">Datos de Ingresos</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportToPDF(revenueData, 'Reporte de Ingresos', [{ header: 'Fecha', dataKey: 'date' }, { header: 'Ingresos', dataKey: 'revenue' }])}><Download className="h-4 w-4 mr-2" />PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(revenueData, 'Reporte de Ingresos')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left"><th className="p-2">Fecha</th><th className="p-2">Ingresos</th></tr></thead>
                      <tbody>{revenueData.map((d, i) => <tr key={i} className="border-t"><td className="p-2">{d.date}</td><td className="p-2">{formatPrice(d.revenue)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="monthly-sales">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas Mensuales</CardTitle>
                  <CardDescription>Total de ingresos por mes en el período seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ total_revenue: { label: 'Ingresos', color: 'hsl(var(--chart-2))' } }} className="h-[300px] w-full">
                    <BarChart data={chartMonthlySalesData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                      <Bar dataKey="total_revenue" fill="var(--color-total_revenue)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                  <div className="font-semibold">Datos de Ventas Mensuales</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportToPDF(monthlySalesData, 'Reporte de Ventas Mensuales', [{ header: 'Mes', dataKey: 'month' }, { header: 'Año', dataKey: 'year' }, { header: 'Ingresos', dataKey: 'total_revenue' }])}><Download className="h-4 w-4 mr-2" />PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(monthlySalesData, 'Reporte de Ventas Mensuales')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left"><th className="p-2">Mes</th><th className="p-2">Año</th><th className="p-2">Ingresos</th></tr></thead>
                      <tbody>{monthlySalesData.map((d, i) => <tr key={i} className="border-t"><td className="p-2">{d.month}</td><td className="p-2">{d.year}</td><td className="p-2">{formatPrice(d.total_revenue)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento de Servicios</CardTitle>
                  <CardDescription>Servicios más populares por número de citas.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ChartContainer config={{ appointments: { label: "Citas" } }} className="h-[300px] w-full max-w-[400px]">
                    <RechartsPieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie data={chartServicesData} dataKey="total_appointments" nameKey="service_name" cx="50%" cy="50%" outerRadius={100} label>
                        {chartServicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="service_name" />} />
                    </RechartsPieChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                  <div className="font-semibold">Datos de Servicios</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportToPDF(servicesData, 'Reporte de Servicios', [{ header: 'Servicio', dataKey: 'service_name' }, { header: 'Citas', dataKey: 'total_appointments' }, { header: 'Ingresos', dataKey: 'total_revenue' }])}><Download className="h-4 w-4 mr-2" />PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(servicesData, 'Reporte de Servicios')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left"><th className="p-2">Servicio</th><th className="p-2">Citas</th><th className="p-2">Ingresos</th></tr></thead>
                      <tbody>{servicesData.map((s, i) => <tr key={i} className="border-t"><td className="p-2">{s.service_name}</td><td className="p-2">{s.total_appointments}</td><td className="p-2">{formatPrice(s.total_revenue)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="staff">
              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento del Personal</CardTitle>
                  <CardDescription>Citas completadas por cada miembro del staff.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ Citas: { label: 'Citas', color: 'hsl(var(--chart-1))' } }} className="h-[300px] w-full">
                    <BarChart data={chartStaffData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                      <Bar dataKey="Citas" fill="var(--color-Citas)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                  <div className="font-semibold">Datos de Staff</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportToPDF(staffData, 'Reporte de Staff', [{ header: 'Staff', dataKey: 'staff_name' }, { header: 'Citas', dataKey: 'total_appointments' }, { header: 'Ingresos', dataKey: 'total_revenue' }, { header: 'Tasa Completado', dataKey: 'completion_rate' }])}><Download className="h-4 w-4 mr-2" />PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(staffData, 'Reporte de Staff')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left"><th className="p-2">Staff</th><th className="p-2">Citas</th><th className="p-2">Ingresos</th><th className="p-2">Tasa Completado</th></tr></thead>
                      <tbody>{staffData.map((s, i) => <tr key={i} className="border-t"><td className="p-2">{s.staff_name}</td><td className="p-2">{s.total_appointments}</td><td className="p-2">{formatPrice(s.total_revenue)}</td><td className="p-2">{s.completion_rate}%</td></tr>)}</tbody>
                    </table>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>Actividad de Clientes</CardTitle>
                  <CardDescription>Top clientes por gasto total en el período.</CardDescription>
                  <div className="flex gap-2 pt-4">
                    <Button size="sm" variant="outline" onClick={() => exportToPDF(clientsData, 'Reporte de Clientes', [
                      { header: 'Nombre', dataKey: 'client_name' },
                      { header: 'Citas', dataKey: 'total_appointments' },
                      { header: 'Gasto Total', dataKey: 'total_spent' },
                      { header: 'Última Cita', dataKey: 'last_appointment_date' },
                    ])}><Download className="h-4 w-4 mr-2" />PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(clientsData, 'Reporte de Clientes')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                    <Button size="sm" variant="outline" onClick={() => exportToCSV(clientsData, 'Reporte de Clientes')}><FileText className="h-4 w-4 mr-2" />CSV</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="py-2 px-4">Cliente</th>
                          <th className="py-2 px-4">Citas</th>
                          <th className="py-2 px-4">Gasto Total</th>
                          <th className="py-2 px-4">Última Cita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientsData.slice(0, 10).map((client, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2 px-4 font-medium">{client.client_name}</td>
                            <td className="py-2 px-4">{client.total_appointments}</td>
                            <td className="py-2 px-4">{formatPrice(client.total_spent)}</td>
                            <td className="py-2 px-4">{client.last_appointment_date ? format(parseISO(client.last_appointment_date), 'dd/MM/yyyy') : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ReportsPanel;
