import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mail, Smartphone, Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Reminder {
  id: number;
  name: string;
  channel: "whatsapp" | "email" | "sms";
  timing: number;
  unit: "minutes" | "hours" | "days";
  message: string;
  active: boolean;
}

const ReminderManagement = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    // Mock data, replace with API call to /api/reminders
    const initialReminders: Reminder[] = [
      {
        id: 1,
        name: "Recordatorio de Cita (24h antes)",
        channel: "whatsapp",
        timing: 24,
        unit: "hours",
        message: "Hola {cliente}, te recordamos tu cita para {servicio} mañana a las {hora}. ¡Te esperamos!",
        active: true
      },
      {
        id: 2,
        name: "Confirmación de Cita (Email)",
        channel: "email",
        timing: 1,
        unit: "hours",
        message: "Estimado/a {cliente}, su cita para {servicio} ha sido agendada para el día {fecha} a las {hora}.",
        active: true
      },
      {
        id: 3,
        name: "Recordatorio SMS (2h antes)",
        channel: "sms",
        timing: 2,
        unit: "hours",
        message: "Cita a las {hora}. ¡No lo olvides!",
        active: false
      }
    ];
    setReminders(initialReminders);
  }, []);

  const [newReminder, setNewReminder] = useState<Omit<Reminder, 'id'>>({
    name: "",
    channel: "whatsapp",
    timing: 1,
    unit: "hours",
    message: "",
    active: true
  });

  const [showNewForm, setShowNewForm] = useState(false);

  const channels = [
    { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-600" },
    { value: "email", label: "Email", icon: Mail, color: "text-blue-600" },
    { value: "sms", label: "SMS", icon: Smartphone, color: "text-purple-600" }
  ];

  const units = [
    { value: "minutes", label: "Minutos" },
    { value: "hours", label: "Horas" },
    { value: "days", label: "Días" }
  ];

  const handleAddReminder = () => {
    const reminder: Reminder = {
      id: reminders.length + 1,
      ...newReminder
    };
    setReminders([...reminders, reminder]);
    setNewReminder({ name: "", channel: "whatsapp", timing: 1, unit: "hours", message: "", active: true });
    setShowNewForm(false);
  };

  const getChannelInfo = (channel: string) => {
    return channels.find(c => c.value === channel) || channels[0];
  };

  const toggleReminder = (id: number) => {
    setReminders(reminders.map(reminder => 
      reminder.id === id ? { ...reminder, active: !reminder.active } : reminder
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Recordatorios</CardTitle>
              <CardDescription>
                Configura recordatorios automáticos para tus clientes
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowNewForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Recordatorio
            </Button>
          </div>
        </CardHeader>
      </Card>

      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Recordatorio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre del recordatorio</Label>
                <Input
                  id="name"
                  value={newReminder.name}
                  onChange={(e) => setNewReminder({...newReminder, name: e.target.value})}
                  placeholder="Ej: Recordatorio WhatsApp 24h"
                />
              </div>
              <div>
                <Label htmlFor="channel">Canal</Label>
                <select
                  id="channel"
                  value={newReminder.channel}
                  onChange={(e) => setNewReminder({...newReminder, channel: e.target.value as "whatsapp" | "email" | "sms"})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {channels.map(channel => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="timing">Tiempo de anticipación</Label>
                <div className="flex gap-2">
                  <Input
                    id="timing"
                    type="number"
                    value={newReminder.timing}
                    onChange={(e) => setNewReminder({...newReminder, timing: parseInt(e.target.value)})}
                    className="w-20"
                  />
                  <select
                    value={newReminder.unit}
                    onChange={(e) => setNewReminder({...newReminder, unit: e.target.value as "minutes" | "hours" | "days"})}
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                  >
                    {units.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({...newReminder, message: e.target.value})}
                  placeholder="Usa variables como {cliente}, {hora}, {servicio}, {direccion}"
                  rows={3}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Variables disponibles: {"{cliente}"}, {"{hora}"}, {"{servicio}"}, {"{direccion}"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddReminder}>
                Crear Recordatorio
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reminders.map((reminder) => {
          const channelInfo = getChannelInfo(reminder.channel);
          const Icon = channelInfo.icon;
          
          return (
            <Card key={reminder.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-100`}>
                      <Icon className={`h-4 w-4 ${channelInfo.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{reminder.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{channelInfo.label}</Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          {reminder.timing} {reminder.unit === 'hours' ? 'horas' : reminder.unit === 'days' ? 'días' : 'minutos'} antes
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reminder.active}
                      onCheckedChange={() => toggleReminder(reminder.id)}
                    />
                    <Badge variant={reminder.active ? "default" : "secondary"}>
                      {reminder.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-sm font-medium">Mensaje:</Label>
                  <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded border">
                    {reminder.message}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ReminderManagement;
