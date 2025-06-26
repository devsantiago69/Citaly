import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, User, Clock, CheckCircle, Award, Star, Search, X, Filter, SlidersHorizontal, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StaffSpecialtyManagement from "./StaffSpecialtyManagement";
import { toast } from "sonner";
import { apiService } from "@/config/api-v2";

interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  schedule: string;
  services: string;
  active: boolean;
  appointments: number;
  rating: number;
  specialties?: Array<{
    id: number;
    name: string;
    color: string;
    is_primary: boolean;
  }>;
}

const StaffManagement = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterBySpecialty, setFilterBySpecialty] = useState<"all" | "with" | "without">("all");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "appointments" | "recent">("name");
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [specialtyDialogStaff, setSpecialtyDialogStaff] = useState<{id: number, name: string} | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  // Función para resaltar texto coincidente
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ?
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark> :
        part
    );
  };

  // Función para filtrar y ordenar staff
  const filterAndSortStaff = (searchValue: string, status: string, specialty: string, sort: string) => {
    let filtered = [...staff];

    // Filtro por texto de búsqueda (más avanzado)
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(member =>
        // Búsqueda en nombre
        member.name.toLowerCase().includes(searchLower) ||
        // Búsqueda en email
        member.email.toLowerCase().includes(searchLower) ||
        // Búsqueda en teléfono
        member.phone.toLowerCase().includes(searchLower) ||
        // Búsqueda en rol
        member.role.toLowerCase().includes(searchLower) ||
        // Búsqueda en horario
        member.schedule.toLowerCase().includes(searchLower) ||
        // Búsqueda en especialidades
        (member.specialties && member.specialties.some(spec =>
          spec.name.toLowerCase().includes(searchLower)
        )) ||
        // Búsqueda por palabras individuales
        searchLower.split(' ').some(word =>
          word.length > 1 && (
            member.name.toLowerCase().includes(word) ||
            member.email.toLowerCase().includes(word) ||
            member.role.toLowerCase().includes(word) ||
            (member.specialties && member.specialties.some(spec =>
              spec.name.toLowerCase().includes(word)
            ))
          )
        )
      );
    }

    // Filtro por estado
    if (status !== "all") {
      filtered = filtered.filter(member =>
        status === "active" ? member.active : !member.active
      );
    }

    // Filtro por especialidades
    if (specialty !== "all") {
      filtered = filtered.filter(member =>
        specialty === "with"
          ? (member.specialties && member.specialties.length > 0)
          : (!member.specialties || member.specialties.length === 0)
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return b.rating - a.rating; // Rating más alto primero
        case "appointments":
          return b.appointments - a.appointments; // Más citas primero
        case "recent":
          return b.id - a.id; // ID más alto = más reciente
        default:
          return 0;
      }
    });

    setFilteredStaff(filtered);
  };

  // Manejar cambios en el campo de búsqueda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    filterAndSortStaff(value, filterStatus, filterBySpecialty, sortBy);
  };

  // Manejar cambios en el filtro de estado
  const handleStatusFilterChange = (status: "all" | "active" | "inactive") => {
    setFilterStatus(status);
    filterAndSortStaff(searchTerm, status, filterBySpecialty, sortBy);
  };

  // Manejar cambios en el filtro de especialidades
  const handleSpecialtyFilterChange = (specialty: "all" | "with" | "without") => {
    setFilterBySpecialty(specialty);
    filterAndSortStaff(searchTerm, filterStatus, specialty, sortBy);
  };

  // Manejar cambios en el ordenamiento
  const handleSortChange = (sort: "name" | "rating" | "appointments" | "recent") => {
    setSortBy(sort);
    filterAndSortStaff(searchTerm, filterStatus, filterBySpecialty, sort);
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterBySpecialty("all");
    setSortBy("name");
    filterAndSortStaff("", "all", "all", "name");
  };

  // Generar sugerencias de búsqueda
  const getSearchSuggestions = () => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const allWords = staff.flatMap(member => [
      ...member.name.toLowerCase().split(' '),
      ...member.role.toLowerCase().split(' '),
      ...member.email.toLowerCase().split(' '),
      ...(member.specialties?.flatMap(spec => spec.name.toLowerCase().split(' ')) || [])
    ]).filter(word =>
      word.length > 2 &&
      word.includes(searchTerm.toLowerCase()) &&
      word !== searchTerm.toLowerCase()
    );

    const uniqueWords = [...new Set(allWords)];
    return uniqueWords.slice(0, 5); // Máximo 5 sugerencias
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await apiService.staff.list();

        // Fetch specialties for each staff member
        const staffWithSpecialties = await Promise.all(
          data.map(async (member: Staff) => {
            try {
              const specialties = await apiService.staff.specialties.list(member.id.toString());
              return { ...member, specialties };
            } catch (error) {
              console.error(`Error fetching specialties for staff ${member.id}:`, error);
              return { ...member, specialties: [] };
            }
          })
        );
          setStaff(staffWithSpecialties);
        setFilteredStaff(staffWithSpecialties);
      } catch (error) {
        console.error("Error fetching staff:", error);
      }
    };

    fetchStaff();
  }, []);

  // Actualizar filtros cuando cambie el staff
  useEffect(() => {
    filterAndSortStaff(searchTerm, filterStatus, filterBySpecialty, sortBy);
  }, [staff]);

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.role) {
      toast.error("Nombre, email y cargo son obligatorios.");
      return;
    }
    try {
      const createdStaff = await apiService.staff.create(newStaff);
      setStaff(prevStaff => [...prevStaff, createdStaff]);
      setNewStaff({ name: "", email: "", phone: "", role: "" });
      setIsDialogOpen(false);
      toast.success("Empleado agregado exitosamente.");
    } catch (error) {
      console.error('Failed to add staff:', error);
      toast.error("No se pudo conectar con el servidor para agregar al empleado.");
    }
  };

  const refreshStaffSpecialties = async (staffId: number) => {
    try {
      const specialties = await apiService.staff.specialties.list(staffId.toString());
      setStaff(currentStaff =>
        currentStaff.map(member =>
          member.id === staffId
            ? { ...member, specialties }
            : member
        )
      );
    } catch (error) {
      console.error(`Error refreshing specialties for staff ${staffId}:`, error);
    }
  };

  return (
    <div className="space-y-6">      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Staff</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Administra tu equipo de trabajo y sus especialidades
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Empleado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Empleado</DialogTitle>
                  <DialogDescription>
                    Completa los datos del nuevo miembro del staff.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                      placeholder="Ej: Dr. Pedro Martínez"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                      placeholder="pedro@clinic.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                      placeholder="+56 9 1111 2222"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Cargo/Especialidad</Label>
                    <Input
                      id="role"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                      placeholder="Ej: Médico General, Estilista"
                    />
                  </div>
                  <Button onClick={handleAddStaff} className="w-full">
                    Agregar Empleado
                  </Button>
                </div>
              </DialogContent>            </Dialog>
          </div>
        </CardHeader>

        {/* Barra de búsqueda y filtros avanzados */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-4">
            {/* Campo de búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, email, rol, especialidades..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Botones de filtro */}
            <div className="flex gap-2">
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${(filterStatus !== "all" || filterBySpecialty !== "all" || sortBy !== "name") ? "bg-blue-50 border-blue-200" : ""}`}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtros
                    {(filterStatus !== "all" || filterBySpecialty !== "all" || sortBy !== "name") && (
                      <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                        {(filterStatus !== "all" ? 1 : 0) + (filterBySpecialty !== "all" ? 1 : 0) + (sortBy !== "name" ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Estado del Staff</Label>
                      <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo el staff</SelectItem>
                          <SelectItem value="active">Solo activos</SelectItem>
                          <SelectItem value="inactive">Solo inactivos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Especialidades</Label>
                      <Select value={filterBySpecialty} onValueChange={handleSpecialtyFilterChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="with">Con especialidades</SelectItem>
                          <SelectItem value="without">Sin especialidades</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ordenar por</Label>
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Nombre A-Z</SelectItem>
                          <SelectItem value="rating">Mayor rating</SelectItem>
                          <SelectItem value="appointments">Más citas</SelectItem>
                          <SelectItem value="recent">Más recientes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(filterStatus !== "all" || filterBySpecialty !== "all" || sortBy !== "name" || searchTerm) && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="w-full"
                        >
                          Limpiar todos los filtros
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Indicadores de filtros activos */}
          <div className="flex flex-wrap gap-2 items-center mb-3">
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Búsqueda: "{searchTerm}"
                <button
                  onClick={() => handleSearchChange("")}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterStatus !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Estado: {filterStatus === "active" ? "Activos" : "Inactivos"}
                <button
                  onClick={() => handleStatusFilterChange("all")}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterBySpecialty !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Especialidades: {filterBySpecialty === "with" ? "Con especialidades" : "Sin especialidades"}
                <button
                  onClick={() => handleSpecialtyFilterChange("all")}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sortBy !== "name" && (
              <Badge variant="secondary" className="text-xs">
                Orden: {
                  sortBy === "rating" ? "Mayor rating" :
                  sortBy === "appointments" ? "Más citas" :
                  "Más recientes"
                }
                <button
                  onClick={() => handleSortChange("name")}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* Resultados de búsqueda */}
          <div className="text-sm text-gray-600 mb-3">
            {searchTerm || filterStatus !== "all" || filterBySpecialty !== "all" ? (
              <span>
                Mostrando {filteredStaff.length} de {staff.length} miembros del staff
                {filteredStaff.length === 0 && staff.length > 0 && " - intenta ajustar los filtros"}
              </span>
            ) : (
              <span>Total: {staff.length} miembros del staff</span>
            )}
          </div>

          {/* Sugerencias rápidas de búsqueda */}
          {searchTerm && getSearchSuggestions().length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Sugerencias de búsqueda:</p>
              <div className="flex flex-wrap gap-1">
                {getSearchSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchChange(suggestion)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-full transition-colors border border-blue-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {searchTerm || filterStatus !== "all" || filterBySpecialty !== "all" ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No se encontraron miembros del staff</p>
                    <p className="text-sm mb-4">
                      No hay miembros del staff que coincidan con los filtros aplicados
                    </p>
                    <div className="space-y-2">
                      {searchTerm && (
                        <p className="text-xs text-gray-400">
                          Búsqueda actual: "{searchTerm}"
                        </p>
                      )}
                      {filterStatus !== "all" && (
                        <p className="text-xs text-gray-400">
                          Filtro de estado: {filterStatus === "active" ? "Solo activos" : "Solo inactivos"}
                        </p>
                      )}
                      {filterBySpecialty !== "all" && (
                        <p className="text-xs text-gray-400">
                          Filtro de especialidades: {filterBySpecialty === "with" ? "Con especialidades" : "Sin especialidades"}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No hay miembros del staff</p>
                    <p className="text-sm">Comienza agregando tu primer empleado</p>
                  </>
                )}
              </div>
              {(searchTerm || filterStatus !== "all" || filterBySpecialty !== "all") ? (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={clearAllFilters}>
                    Limpiar filtros
                  </Button>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Empleado
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Agregar primer empleado
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <Card key={member.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {highlightMatch(member.name, searchTerm)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {highlightMatch(member.role, searchTerm)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={member.active ? "default" : "secondary"}>
                        {member.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    {/* Especialidades */}
                    {member.specialties && member.specialties.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {member.specialties.slice(0, 3).map((specialty) => (
                            <Badge
                              key={specialty.id}
                              variant="outline"
                              className="text-xs flex items-center gap-1"
                              style={{
                                borderColor: specialty.color,
                                color: specialty.color
                              }}
                            >                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: specialty.color }}
                              />
                              {highlightMatch(specialty.name, searchTerm)}
                              {specialty.is_primary === true ? (
                                <Crown className="h-2 w-2 ml-1" />
                              ) : specialty.is_primary === false ? (
                                <div className="w-2 h-2 ml-1"></div>
                              ) : null}
                            </Badge>
                          ))}
                          {member.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.specialties.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t text-sm text-gray-500 space-y-1">
                      <p>Email: {highlightMatch(member.email, searchTerm)}</p>
                      <p>Teléfono: {highlightMatch(member.phone, searchTerm)}</p>
                      <div className="flex justify-between">
                        <span>Citas: {member.appointments}</span>
                        <span>Rating: {member.rating} ★</span>
                      </div>
                      {member.schedule && (
                        <p>Horario: {highlightMatch(member.schedule, searchTerm)}</p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-200">
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 hover:border-purple-200"
                        onClick={() => setSpecialtyDialogStaff({ id: member.id, name: member.name })}
                      >
                        <Award className="h-3 w-3 mr-1" /> Especialidades
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200">
                        <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de especialidades del staff */}
      {specialtyDialogStaff && (
        <StaffSpecialtyManagement
          staffId={specialtyDialogStaff.id}
          staffName={specialtyDialogStaff.name}
          isOpen={!!specialtyDialogStaff}
          onClose={() => {
            refreshStaffSpecialties(specialtyDialogStaff.id);
            setSpecialtyDialogStaff(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffManagement;
