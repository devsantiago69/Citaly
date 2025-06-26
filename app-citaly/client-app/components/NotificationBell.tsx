
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const NotificationBell = () => {
  const [hasNotifications, setHasNotifications] = useState(true);
  const [notifications] = useState([
    {
      id: 1,
      message: "Carlos Ruiz cambió su cita para mañana",
      time: "hace 5 min",
      type: "change"
    },
    {
      id: 2,
      message: "Nueva cita agendada para Ana López",
      time: "hace 15 min",
      type: "new"
    },
    {
      id: 3,
      message: "Recordatorio: Cita con Pedro en 30 min",
      time: "hace 25 min",
      type: "reminder"
    }
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "change": return "🔄";
      case "new": return "✨";
      case "reminder": return "⏰";
      default: return "📄";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {hasNotifications ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          {notifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500">
              {notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
        </div>
        {notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="p-3 cursor-pointer hover:bg-gray-50">
                <div className="flex items-start gap-3 w-full">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-blue-600 hover:text-blue-700">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay notificaciones nuevas</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;