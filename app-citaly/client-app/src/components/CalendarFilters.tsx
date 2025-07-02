import { useEffect, useState } from "react";
import { apiService } from "../config/api-v2";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";

// Ejemplo de evento/cita para el calendario
interface CalendarEvent {
  id: number;
  date: string;
  time?: string;
  status?: string;
  client?: string;
  service?: string;
  notes?: string;
}

export default function CalendarFilters() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        // Trae todos los eventos del día actual usando el endpoint correcto
        const today = new Date().toISOString().slice(0, 10);
        const response = await apiService.getCalendarDay(today);
        const data = response?.data?.data || [];
        setEvents(Array.isArray(data) ? data : Object.values(data));
      } catch (err) {
        setError('Error al cargar eventos del calendario');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendarEvents();
  }, []);

  const handleEventClick = async (eventId: number) => {
    setDetailLoading(true);
    setModalOpen(true);
    try {
      // Busca el evento seleccionado en el array actual (ya tiene detalles)
      const event = events.find(e => e.id === eventId) || null;
      setSelectedEvent(event);
    } catch (err) {
      setSelectedEvent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Eventos del Calendario</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-blue-600">Cargando eventos...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && events.length === 0 && (
          <div className="text-gray-500">No hay eventos para mostrar.</div>
        )}
        {!loading && !error && events.length > 0 && (
          <ul className="space-y-2">
            {events.map(event => (
              <li key={event.id} className="border-b last:border-b-0 pb-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-blue-700 cursor-pointer hover:underline" onClick={() => handleEventClick(event.id)}>
                    {event.service || `Evento #${event.id}`}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{event.date} {event.time}</span>
                  {event.status && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{event.status}</span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleEventClick(event.id)}>
                  Ver detalle
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          {detailLoading ? (
            <div className="text-blue-600">Cargando detalle...</div>
          ) : selectedEvent ? (
            <>
              <DialogHeader>
                <DialogTitle>Detalle del Evento</DialogTitle>
                <DialogDescription>
                  <span className="font-semibold">ID:</span> {selectedEvent.id}<br />
                  <span className="font-semibold">Servicio:</span> {selectedEvent.service || `Evento #${selectedEvent.id}`}<br />
                  <span className="font-semibold">Fecha:</span> {selectedEvent.date}<br />
                  {selectedEvent.time && (<><span className="font-semibold">Hora:</span> {selectedEvent.time}<br /></>)}
                  {selectedEvent.status && (<><span className="font-semibold">Estado:</span> {selectedEvent.status}<br /></>)}
                  {selectedEvent.client && (<><span className="font-semibold">Cliente:</span> {selectedEvent.client}<br /></>)}
                  {selectedEvent.notes && (<><span className="font-semibold">Notas:</span> {selectedEvent.notes}<br /></>)}
                </DialogDescription>
              </DialogHeader>
            </>
          ) : (
            <div className="text-gray-500">No se pudo cargar el detalle del evento.</div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
