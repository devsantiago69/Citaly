import React, { useEffect, useState, useMemo } from "react";
import { api } from "../config/api";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "./ui/dropdown-menu";
import { UserIcon, PhoneIcon, MailIcon, XIcon, StoreIcon, CreditCardIcon, EyeIcon, MoreVertical, Eraser } from "lucide-react";

interface Appointment {
  id: number;
  fecha: string;
  hora: string;
  estado: string;
  notas: string;
  canal: string;
  origen: string;
  estado_pago?: string | null;
  medio_pago?: string | null;
  cliente: {
    id: number;
    nombre_completo: string;
    telefono: string;
    email: string;
  };
  servicio: {
    nombre: string;
    duracion: number;
    precio: number;
    categoria: string;
  };
  personal: {
    nombre: string;
    telefono: string;
  } | null;
  sucursal: {
    nombre: string;
    direccion: string;
  };
}

const statusColors: Record<string, string> = {
  "Programada": "bg-gray-100 text-gray-800",
  "Confirmada": "bg-purple-100 text-purple-800",
  "Pendiente": "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  "Completada": "bg-green-100 text-green-800",
  "Cancelada": "bg-red-100 text-red-800",
};

export default function AppointmentsDataTable() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [sucursalFilter, setSucursalFilter] = useState<string | undefined>(undefined);
  const [personalFilter, setPersonalFilter] = useState<string | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sucursales, setSucursales] = useState<{nombre: string}[]>([]);
  const [personalList, setPersonalList] = useState<{nombre: string}[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get("/api/citas/datatable")
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setAppointments(data.data);
          // Extraer sucursales y personal únicos para los filtros
          setSucursales(
            Array.from(new Set(data.data.map((a: Appointment) => a.sucursal.nombre)))
              .filter((nombre): nombre is string => typeof nombre === "string")
              .map(nombre => ({ nombre }))
          );
          setPersonalList(
            Array.from(new Set(data.data.filter((a: Appointment) => a.personal?.nombre).map((a: Appointment) => a.personal!.nombre)))
              .filter((nombre): nombre is string => typeof nombre === "string")
              .map(nombre => ({ nombre }))
          );
        } else if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setAppointments([]);
          setError("Respuesta inesperada de la API. Consulta la consola para más detalles.");
        }
      })
      .catch((err) => {
        setAppointments([]);
        setError("Error al obtener citas: " + (err?.message || "Desconocido"));
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtros y búsqueda
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch =
        search === "" ||
        apt.cliente.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
        apt.servicio.nombre.toLowerCase().includes(search.toLowerCase()) ||
        apt.sucursal.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (apt.personal?.nombre?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStatus = !statusFilter || apt.estado === statusFilter;
      const matchesSucursal = !sucursalFilter || apt.sucursal.nombre === sucursalFilter;
      const matchesPersonal = !personalFilter || apt.personal?.nombre === personalFilter;
      const matchesDate = !dateFilter || isSameDay(parseISO(apt.fecha), dateFilter);
      return matchesSearch && matchesStatus && matchesSucursal && matchesPersonal && matchesDate;
    });
  }, [appointments, search, statusFilter, sucursalFilter, personalFilter, dateFilter]);

  // --- FUNCIONES PARA ACCIONES DE CITA ---
  const handleCancelarCita = (apt: Appointment) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return;
    api.post(`/api/citas/${apt.id}/cancelar`, {})
      .then(() => {
        alert('Cita cancelada exitosamente');
        window.location.reload();
      })
      .catch((err: any) => {
        alert('Error al cancelar cita: ' + (err?.response?.data?.message || err.message));
      });
  };
  const handleReagendarCita = (apt: Appointment) => {
    const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', apt.fecha);
    const nuevaHora = prompt('Nueva hora (HH:mm):', apt.hora);
    if (!nuevaFecha || !nuevaHora) return;
    api.post(`/api/citas/${apt.id}/reagendar`, { fecha: nuevaFecha, hora: nuevaHora })
      .then(() => {
        alert('Cita reagendada exitosamente');
        window.location.reload();
      })
      .catch((err: any) => {
        alert('Error al reagendar cita: ' + (err?.response?.data?.message || err.message));
      });
  };
  const handleAsignarSucursal = (apt: Appointment) => {
    const nuevaSucursal = prompt('ID de la nueva sucursal:', '');
    if (!nuevaSucursal) return;
    api.post(`/api/citas/${apt.id}/asignar-sucursal`, { sucursal_id: nuevaSucursal })
      .then(() => {
        alert('Sucursal asignada exitosamente');
        window.location.reload();
      })
      .catch((err: any) => {
        alert('Error al asignar sucursal: ' + (err?.response?.data?.message || err.message));
      });
  };
  const handlePagarCita = (apt: Appointment) => {
    const medioPago = prompt('Medio de pago:', apt.medio_pago || 'Efectivo');
    if (!medioPago) return;
    api.post(`/api/citas/${apt.id}/pagar`, { medio_pago: medioPago })
      .then(() => {
        alert('Cita marcada como pagada');
        window.location.reload();
      })
      .catch((err: any) => {
        alert('Error al marcar como pagada: ' + (err?.response?.data?.message || err.message));
      });
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 md:gap-4">
        <div className="flex flex-wrap gap-2 items-end">
          <Input
            placeholder="Buscar cliente, servicio, sucursal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56"
          />
          <Select value={statusFilter} onValueChange={value => setStatusFilter(value === undefined ? undefined : value)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(statusColors).map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sucursalFilter} onValueChange={value => setSucursalFilter(value === undefined ? undefined : value)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              {sucursales.map(s => (
                <SelectItem key={s.nombre} value={s.nombre}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={personalFilter} onValueChange={value => setPersonalFilter(value === undefined ? undefined : value)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Profesional" />
            </SelectTrigger>
            <SelectContent>
              {personalList.map(p => (
                <SelectItem key={p.nombre} value={p.nombre}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-36 justify-start text-left" onClick={() => setShowCalendar(true)}>
                {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Filtrar por fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFilter ?? undefined}
                onSelect={date => { setDateFilter(date ?? null); setShowCalendar(false); }}
                initialFocus
              />
              {dateFilter && (
                <Button size="sm" variant="ghost" className="w-full mt-1" onClick={() => setDateFilter(null)}>
                  Limpiar fecha
                </Button>
              )}
            </PopoverContent>
          </Popover>
          <Button
            variant="secondary"
            className="ml-2 flex items-center gap-2"
            onClick={() => {
              setSearch("");
              setStatusFilter(undefined);
              setSucursalFilter(undefined);
              setPersonalFilter(undefined);
              setDateFilter(null);
            }}
          >
            <Eraser className="w-4 h-4" /> Limpiar filtros
          </Button>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => alert('Función para agregar cita (pendiente)')}>+ Nueva Cita</Button>
      </div>
      {error && (
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-2">{error}</div>
      )}
      {/* Tarjetas de citas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">Cargando...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="col-span-full text-center py-8">No hay citas que coincidan con los filtros.</div>
        ) : (
          filteredAppointments.map((apt) => (
            <Card key={apt.id} className="rounded-2xl shadow-lg border border-blue-100 hover:shadow-2xl transition-shadow duration-200 cursor-pointer flex flex-col justify-between">
              <CardHeader className="flex flex-row items-center gap-4 border-b bg-blue-50 rounded-t-2xl py-4 px-6">
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarFallback><UserIcon /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 truncate">
                    {apt.cliente.nombre_completo}
                    <Badge variant="secondary" className="ml-2">Cliente</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 flex-wrap">
                    <PhoneIcon className="w-4 h-4" /> {apt.cliente.telefono}
                    <MailIcon className="w-4 h-4 ml-4" /> {apt.cliente.email}
                  </div>
                  <div className="mt-2">
                    <Badge className={statusColors[apt.estado] || "bg-gray-100 text-gray-800"}>
                      {apt.estado}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex flex-wrap gap-4 mb-2">
                  <div className="flex flex-col text-xs text-gray-500">
                    <span className="font-bold text-base text-blue-900">{apt.servicio.nombre}</span>
                    <span>Duración: {apt.servicio.duracion} min</span>
                    <span>Precio: ${apt.servicio.precio}</span>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500">
                    <span className="font-bold">Profesional:</span>
                    <span>{apt.personal?.nombre || "-"}</span>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500">
                    <span className="font-bold">Sucursal:</span>
                    <span>{apt.sucursal.nombre}</span>
                  </div>
                  <div className="flex flex-col text-xs text-gray-500">
                    <span className="font-bold">Fecha:</span>
                    <span>{format(parseISO(apt.fecha), "yyyy-MM-dd")}</span>
                    <span className="font-bold mt-1">Hora: <span className="font-normal">{apt.hora}</span></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-2">
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200">Pago: {apt.estado_pago || "-"}</Badge>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">Medio: {apt.medio_pago || "-"}</Badge>
                  <Badge variant="secondary" className="bg-gray-50 text-gray-700 border border-gray-200">Canal: {apt.canal || "-"}</Badge>
                  <Badge variant="secondary" className="bg-gray-50 text-gray-700 border border-gray-200">Origen: {apt.origen || "-"}</Badge>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelected(apt); }}>
                    <EyeIcon className="w-4 h-4 mr-2" /> Ver Detalles
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCancelarCita(apt)} disabled={apt.estado === 'Cancelada'}>
                        <XIcon className="w-4 h-4 mr-2 text-red-500" /> Cancelar cita
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleReagendarCita(apt)} disabled={apt.estado === 'Cancelada'}>
                        <StoreIcon className="w-4 h-4 mr-2 text-blue-500" /> Reagendar cita
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAsignarSucursal(apt)}>
                        <StoreIcon className="w-4 h-4 mr-2 text-blue-500" /> Asignar a otra sucursal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePagarCita(apt)}>
                        <CreditCardIcon className="w-4 h-4 mr-2 text-green-500" /> Pagar cita
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {/* Detalle de la cita mejorado */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <Card className="relative w-full max-w-2xl p-0 shadow-2xl border-2 border-blue-200 rounded-3xl overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <Button size="icon" variant="ghost" className="hover:bg-red-100" onClick={() => setSelected(null)} aria-label="Cerrar Detalle">
                <XIcon className="w-6 h-6 text-gray-500 hover:text-red-500 transition" />
              </Button>
            </div>
            <CardHeader className="flex flex-row items-center gap-6 border-b bg-gradient-to-r from-blue-50 to-blue-100 py-6 px-8">
              <Avatar className="w-20 h-20 shadow-md border-2 border-blue-200">
                <AvatarFallback><UserIcon className="w-10 h-10" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 truncate text-blue-900">
                  {selected.cliente.nombre_completo}
                  <Badge variant="secondary" className="ml-2 bg-blue-200 text-blue-900">Cliente</Badge>
                </CardTitle>
                <div className="flex items-center gap-4 text-base text-gray-700 mt-2 flex-wrap">
                  <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" /> {selected.cliente.telefono}</span>
                  <span className="flex items-center gap-1"><MailIcon className="w-4 h-4" /> {selected.cliente.email}</span>
                </div>
                <div className="mt-3">
                  <Badge className={statusColors[selected.estado] || "bg-gray-100 text-gray-800"}>
                    {selected.estado}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 bg-white">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="mb-6 flex gap-2">
                  <TabsTrigger value="info" className="rounded-full px-6 py-2 text-base">Información</TabsTrigger>
                  <TabsTrigger value="notas" className="rounded-full px-6 py-2 text-base">Notas</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg"><b>Servicio:</b> <span className="text-blue-900 font-semibold">{selected.servicio.nombre}</span> <span className="text-xs text-gray-500">({selected.servicio.duracion} min, ${selected.servicio.precio})</span></div>
                      <div className="flex items-center gap-2 text-lg"><b>Profesional:</b> <span className="text-blue-900">{selected.personal?.nombre || "-"}</span></div>
                      <div className="flex items-center gap-2 text-lg"><b>Sucursal:</b> <span className="text-blue-900">{selected.sucursal.nombre}</span> <span className="text-xs text-gray-500">({selected.sucursal.direccion})</span></div>
                      <div className="flex items-center gap-2 text-lg"><b>Fecha:</b> <span className="text-blue-900">{format(parseISO(selected.fecha), "yyyy-MM-dd")}</span> <b className="ml-2">Hora:</b> <span className="text-blue-900">{selected.hora}</span></div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg"><b>Estado:</b> <Badge className={statusColors[selected.estado] || "bg-gray-100 text-gray-800"}>{selected.estado}</Badge></div>
                      <div className="flex items-center gap-2 text-lg"><b>Pago:</b> <span className="text-blue-900">{selected.estado_pago || "-"}</span></div>
                      <div className="flex items-center gap-2 text-lg"><b>Medio de Pago:</b> <span className="text-blue-900">{selected.medio_pago || "-"}</span></div>
                      <div className="flex items-center gap-2 text-lg"><b>Canal:</b> <span className="text-blue-900">{selected.canal || "-"}</span></div>
                      <div className="flex items-center gap-2 text-lg"><b>Origen:</b> <span className="text-blue-900">{selected.origen || "-"}</span></div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="notas">
                  <div className="bg-blue-50 rounded-xl p-4 min-h-[80px] text-gray-700 text-lg shadow-inner">
                    {selected.notas ? selected.notas : <span className="text-gray-400">Sin notas</span>}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
