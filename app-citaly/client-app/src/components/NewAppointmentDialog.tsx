import { useState, useEffect } from "react";
import { Calendar, Clock, User, Phone, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  category: string;
}

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewAppointmentDialog = ({ open, onOpenChange }: NewAppointmentDialogProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    service: "",
    date: "",
    time: "",
    notes: ""
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/services', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setServices(data.servicios || []);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    // Mock time slots as there is no API for it yet
    const mockTimeSlots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
    ];

    fetchServices();
    setTimeSlots(mockTimeSlots);
  }, []);

  const handleSubmit = () => {
    if (!formData.clientName || !formData.service || !formData.date || !formData.time) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    toast.success("Cita agendada exitosamente");
    setFormData({
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      service: "",
      date: "",
      time: "",
      notes: ""
    });
    onOpenChange(false);
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Nueva Cita
          </DialogTitle>
          <DialogDescription>
            Completa los datos para agendar una nueva cita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="clientName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nombre del cliente *
            </Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              placeholder="Nombre completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone}
                onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                placeholder="+56912345678"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          <div>
            <Label>Servicio *</Label>
            <Select value={formData.service} onValueChange={(value) => setFormData({...formData, service: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={String(service.id)}>
                    <div className="flex items-center justify-between w-full">
                      <span>{service.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({service.duration} min)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                min={getTomorrowDate()}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora *
              </Label>
              <Select value={formData.time} onValueChange={(value) => setFormData({...formData, time: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Información adicional sobre la cita..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Agendar Cita
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentDialog;
