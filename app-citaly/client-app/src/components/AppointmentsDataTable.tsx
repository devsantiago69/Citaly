import React, { useEffect, useState, useMemo } from "react";
import { api } from "../config/api";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
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
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Profesional</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Medio de Pago</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">Cargando...</TableCell>
              </TableRow>
            ) : filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">No hay citas que coincidan con los filtros.</TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((apt) => (
                <TableRow key={apt.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setSelected(apt)}>
                  <TableCell>{format(parseISO(apt.fecha), "yyyy-MM-dd")}</TableCell>
                  <TableCell>{apt.hora}</TableCell>
                  <TableCell>{apt.cliente.nombre_completo}</TableCell>
                  <TableCell>{apt.servicio.nombre}</TableCell>
                  <TableCell>{apt.personal?.nombre || "-"}</TableCell>
                  <TableCell>{apt.sucursal.nombre}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[apt.estado] || "bg-gray-100 text-gray-800"}>{apt.estado}</Badge>
                  </TableCell>
                  <TableCell>{apt.estado_pago || "-"}</TableCell>
                  <TableCell>{apt.medio_pago || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(apt)}>
                          <EyeIcon className="w-4 h-4 mr-2" /> Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <XIcon className="w-4 h-4 mr-2 text-red-500" /> Opciones de Cita
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleCancelarCita(apt)} disabled={apt.estado === 'Cancelada'}>
                              <XIcon className="w-4 h-4 mr-2 text-red-500" /> Cancelar cita
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReagendarCita(apt)} disabled={apt.estado === 'Cancelada'}>
                              <StoreIcon className="w-4 h-4 mr-2 text-blue-500" /> Reagendar cita
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={() => handleAsignarSucursal(apt)}>
                          <StoreIcon className="w-4 h-4 mr-2 text-blue-500" /> Asignar a otra sucursal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePagarCita(apt)}>
                          <CreditCardIcon className="w-4 h-4 mr-2 text-green-500" /> Pagar cita
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Detalle de la cita mejorado */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="relative w-full max-w-2xl p-0">
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 z-10" onClick={() => setSelected(null)}>
              <XIcon className="w-5 h-5" />
            </Button>
            <CardHeader className="flex flex-row items-center gap-4 border-b">
              <Avatar className="w-16 h-16">
                <AvatarFallback><UserIcon /></AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {selected.cliente.nombre_completo}
                  <Badge variant="secondary" className="ml-2">Cliente</Badge>
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <PhoneIcon className="w-4 h-4" /> {selected.cliente.telefono}
                  <MailIcon className="w-4 h-4 ml-4" /> {selected.cliente.email}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="notas">Notas</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><b>Servicio:</b> {selected.servicio.nombre} <span className="text-xs text-gray-500">({selected.servicio.duracion} min, ${selected.servicio.precio})</span></div>
                      <div className="flex items-center gap-2"><b>Profesional:</b> {selected.personal?.nombre || "-"}</div>
                      <div className="flex items-center gap-2"><b>Sucursal:</b> {selected.sucursal.nombre} <span className="text-xs text-gray-500">({selected.sucursal.direccion})</span></div>
                      <div className="flex items-center gap-2"><b>Fecha:</b> {format(parseISO(selected.fecha), "yyyy-MM-dd")} <b className="ml-2">Hora:</b> {selected.hora}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><b>Estado:</b> <Badge className={statusColors[selected.estado] || "bg-gray-100 text-gray-800"}>{selected.estado}</Badge></div>
                      <div className="flex items-center gap-2"><b>Pago:</b> {selected.estado_pago || "-"}</div>
                      <div className="flex items-center gap-2"><b>Medio de Pago:</b> {selected.medio_pago || "-"}</div>
                      <div className="flex items-center gap-2"><b>Canal:</b> {selected.canal || "-"}</div>
                      <div className="flex items-center gap-2"><b>Origen:</b> {selected.origen || "-"}</div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="notas">
                  <div className="bg-gray-50 rounded p-3 min-h-[60px] text-gray-700">
                    {selected.notas || <span className="text-gray-400">Sin notas</span>}
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
