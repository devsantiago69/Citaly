import { Calendar, Home, Clock, Settings, Users, UserCheck, BarChart3, Cog, Bell, Menu, X, User, CreditCard, LogOut, Building, Palette, Shield, Award } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, path: "/" },
    { id: "calendar", label: "Calendario", icon: Calendar, path: "/calendar" },
    { id: "appointments", label: "Citas", icon: Clock, path: "/appointments" },
    { id: "services", label: "Servicios", icon: Settings, path: "/services" },
    { id: "categories", label: "Categor�as", icon: Palette, path: "/categories" },
    { id: "specialties", label: "Especialidades", icon: Award, path: "/specialties" },
    { id: "users", label: "Clientes", icon: Users, path: "/users" },
    { id: "staff", label: "Staff", icon: UserCheck, path: "/staff" },
    { id: "reports", label: "Reportes", icon: BarChart3, path: "/reports" },
    { id: "company-info", label: "Mi Empresa", icon: Building, path: "/company" },
    { id: "admin-profile", label: "Mi Perfil", icon: User, path: "/profile" },
    { id: "admin-management", label: "Administraci�n", icon: Shield, path: "/admin" },
    { id: "branches", label: "Sucursales", icon: Building, path: "/branches" },
    { id: "billing", label: "Facturación", icon: CreditCard, path: "/billing" },
    { id: "settings", label: "Configuración", icon: Cog, path: "/settings" },
    { id: "reminders", label: "Recordatorios", icon: Bell, path: "/reminders" },
  ];

  const NavLink = ({ item }: { item: typeof menuItems[0] }) => (
    <Link
      to={item.path}
      onClick={() => {
        if (isMobileOpen) setIsMobileOpen(false);
      }}
      className={cn(
        "flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
        location.pathname === item.path
          ? "bg-blue-600 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        isCollapsed && "justify-center"
      )}
    >
      <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );

  return (
    <div className="relative">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 right-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out overflow-y-auto",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Rest of your sidebar content */}
        <div className="flex flex-col h-full">
          {/* Logo and collapse button */}
          <div className="flex items-center justify-between p-4 border-b">
            {!isCollapsed && <span className="text-xl font-bold">Citaly</span>}
            <Button
              variant="ghost"
              size="sm"
              className="lg:flex hidden"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Company Info */}
          {user && user.company && (
            <div className="py-3 px-4 border-b">
              {!isCollapsed ? (
                <>
                  <p className="text-sm text-gray-500">Empresa</p>
                  <h2 className="font-semibold text-gray-900 truncate">{user.company.name}</h2>
                </>
              ) : (
                <div className="flex justify-center">
                  <Building className="h-5 w-5 text-gray-500" />
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1">
            {menuItems.map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={logout}
            >
              <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>Cerrar Sesi�n</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content spacer */}
      <div className={cn(
        "lg:ml-64 transition-all duration-300",
        isCollapsed && "lg:ml-16"
      )}>
        {/* Your main content goes here */}
      </div>
    </div>
  );
};

export default Sidebar;
