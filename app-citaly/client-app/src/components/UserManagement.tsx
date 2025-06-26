import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Phone, Mail, User as UserIcon, Search, SlidersHorizontal, X, Calendar as CalendarIcon, ChevronDown, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { ClientWizardForm } from "./ClientWizardForm";
import UserForm from "./UserForm";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { apiService } from "@/config/api-v2";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  document_type: string;
  document_number: string;
  birth_date: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_type: string;
  medical_conditions?: string;
  total_appointments: number;
  total_spent: number;
  last_visit: string;
  status: string;
  user_type_id?: number;
  user_type?: {
    id: number;
    name: string;
    level: string;
    description: string;
  };
}

interface UserType {
  id: number;
  name: string;
  level: string;
  description: string;
  active: boolean;
}

// Tipos para las funciones
interface QueryParams {
  searchTerm?: string;
  status?: string;
  hasAppointments?: string;
  city?: string;
  userType?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  document_type: string;
  document_number: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_type?: string;
  medical_conditions?: string;
  user_type_id?: number;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);const [filters, setFilters] = useState({
    status: "all",
    hasAppointments: "all",
    city: "",
    userType: "all",
    dateRange: undefined as DateRange | undefined,
  });
  const [sortBy, setSortBy] = useState("created_at-desc");
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: QueryParams = {};
      if (searchTerm) params.searchTerm = searchTerm;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.hasAppointments !== 'all') params.hasAppointments = filters.hasAppointments;
      if (filters.city) params.city = filters.city;
      if (filters.userType !== 'all') params.userType = filters.userType;
      if (filters.dateRange?.from) params.startDate = format(filters.dateRange.from, 'yyyy-MM-dd');
      if (filters.dateRange?.to) params.endDate = format(filters.dateRange.to, 'yyyy-MM-dd');

      const [sortField, sortOrder] = sortBy.split('-');
      if (sortField) params.sortBy = sortField;
      if (sortOrder) params.sortOrder = sortOrder;

      const data = await apiService.clients.list(params);
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios. Intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, sortBy, toast]);

  const fetchUserTypes = useCallback(async () => {
    try {
      const data = await apiService.userTypes.list();
      setUserTypes(data.filter((userType: UserType) => userType.active));
    } catch (error) {
      console.error("Error fetching user types:", error);
    }
  }, []);
  useEffect(() => {
    fetchUserTypes();
  }, [fetchUserTypes]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [fetchUsers]);

  const handleFilterChange = (key: keyof typeof filters, value: string | DateRange | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      status: "all",
      hasAppointments: "all",
      city: "",
      userType: "all",
      dateRange: undefined,
    });
    setSortBy("created_at-desc");
  };
  const handleAddUser = async (userData: UserData) => {
    setLoading(true);
    try {
      await apiService.clients.create(userData);
      await fetchUsers();
      setIsDialogOpen(false);
      toast({
        title: "蓌ito",
        description: "Usuario creado correctamente",
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: UserData) => {
    setLoading(true);
    try {
      await apiService.clients.create(userData);
      await fetchUsers();
      setIsUserFormOpen(false);
      toast({
        title: "蓌ito",
        description: "Usuario creado correctamente",
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userData: UserData) => {
    if (!selectedUserForEdit) return;
    setLoading(true);
    try {
      await apiService.clients.update(selectedUserForEdit.id.toString(), userData);
      await fetchUsers();
      setIsUserFormOpen(false);
      setIsEditingUser(false);
      setSelectedUserForEdit(null);
      toast({
        title: "蓌ito",
        description: "Usuario actualizado correctamente",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteUser = async (id: number) => {
    try {
      await apiService.clients.delete(id.toString());
      await fetchUsers();
      toast({
        title: "蓌ito",
        description: "Usuario eliminado correctamente",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedUser(null);
  };

  const handleUserFormClose = () => {
    setIsUserFormOpen(false);
    setIsEditingUser(false);
    setSelectedUserForEdit(null);
  };

  const handleEditUserClick = (user: User) => {
    setSelectedUserForEdit(user);
    setIsEditingUser(true);
    setIsUserFormOpen(true);
  };

  const handleEditClient = async (userData: UserData) => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await apiService.clients.update(selectedUser.id.toString(), userData);
      await fetchUsers();
      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedUser(null);
      toast({
        title: "蓌ito",
        description: "Cliente actualizado correctamente",
      });
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.hasAppointments !== 'all' ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.dateRange ? 1 : 0) +
    (sortBy !== 'created_at-desc' ? 1 : 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Gesti髇 de Usuarios</CardTitle>
            <div className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setIsEditingUser(false);
                  setSelectedUserForEdit(null);
                  setIsUserFormOpen(true);
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setIsEditMode(false);
                  setSelectedUser(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>
          </div>
          {/* Filters UI */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, email, tel茅fono..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-500 text-white rounded-full px-2">{activeFilterCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">Filtros Avanzados</h4>
                  <div className="grid gap-2">
                    <Label>Estado</Label>
                    <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="blocked">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Citas</Label>
                    <Select value={filters.hasAppointments} onValueChange={value => handleFilterChange('hasAppointments', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="yes">Con citas</SelectItem>
                        <SelectItem value="no">Sin citas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Ciudad</Label>
                    <Input value={filters.city} onChange={e => handleFilterChange('city', e.target.value)} placeholder="Ej: Santiago" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Fecha de Creaci贸n</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange?.from ? (
                            filters.dateRange.to ? (
                              <>{format(filters.dateRange.from, "LLL dd, y")} - {format(filters.dateRange.to, "LLL dd, y")}</>
                            ) : (
                              format(filters.dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Seleccionar rango</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={filters.dateRange}
                          onSelect={value => handleFilterChange('dateRange', value)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Usuario</Label>
                    <Select value={filters.userType} onValueChange={value => handleFilterChange('userType', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {userTypes.map((userType) => (
                          <SelectItem key={userType.id} value={userType.name}>
                            {userType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" onClick={clearFilters} className="w-full">Limpiar Filtros</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">M谩s Recientes</SelectItem>
                <SelectItem value="created_at-asc">M谩s Antiguos</SelectItem>
                <SelectItem value="last_name-asc">Nombre (A-Z)</SelectItem>
                <SelectItem value="last_name-desc">Nombre (Z-A)</SelectItem>
                <SelectItem value="total_spent-desc">Mayor Gasto</SelectItem>
                <SelectItem value="total_appointments-desc">M谩s Citas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-blue-600" />
                        </div>                        <div>
                          <h3 className="font-semibold">{`${user.first_name} ${user.last_name}`}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge className={`${getStatusColor(user.status)}`}>
                              {user.status}
                            </Badge>
                            {user.user_type && (
                              <Badge variant="outline" className="text-xs">
                                {user.user_type.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>                      <div className="flex items-center gap-1">
                        {user.user_type_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUserClick(user)}
                            title="Editar Usuario"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                            title="Editar Cliente"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t text-sm text-gray-500 space-y-1">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {user.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> {user.phone}
                      </p>
                      <p>Documento: {user.document_type} {user.document_number}</p>
                      <p>Direcci贸n: {[user.address, user.city, user.state, user.country].filter(Boolean).join(', ')}</p>
                      <p>Contacto de emergencia: {user.emergency_contact_name} {user.emergency_contact_phone ? `(${user.emergency_contact_phone})` : ''}</p>
                      {user.medical_conditions && (
                        <p>Condiciones m茅dicas: {user.medical_conditions}</p>
                      )}
                      <div className="mt-2 pt-2 border-t">
                        <p>Citas totales: {user.total_appointments}</p>
                        <p>Total gastado: {formatPrice(user.total_spent)}</p>
                        <p>脷ltima visita: {user.last_visit ? new Date(user.last_visit).toLocaleDateString() : 'Sin visitas'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No se encontraron clientes que coincidan con los filtros.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="lg:max-w-screen-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              Complete la informaci贸n del cliente paso a paso.
            </DialogDescription>
          </DialogHeader>          <ClientWizardForm
            onSubmit={isEditMode ? handleEditClient : handleAddUser}
            loading={loading}
            client={selectedUser}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isUserFormOpen} onOpenChange={handleUserFormClose}>
        <DialogContent className="lg:max-w-screen-lg">
          <DialogHeader>
            <DialogTitle>{isEditingUser ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
            <DialogDescription>
              Complete la informaci贸n del usuario y seleccione su tipo.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            onSubmit={isEditingUser ? handleUpdateUser : handleCreateUser}
            loading={loading}
            user={selectedUserForEdit}
            onCancel={handleUserFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;