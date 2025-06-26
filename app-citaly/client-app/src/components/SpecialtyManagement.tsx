import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, X, Users, Award, Star, Filter, SlidersHorizontal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";
import { Switch } from "./ui/switch";
import { apiService } from "@/config/api-v2";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Specialty {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

type NewSpecialty = Omit<Specialty, "id">;

const SpecialtyManagement = () => {
  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [filteredSpecialties, setFilteredSpecialties] = useState<Specialty[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "status">("name");
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState<NewSpecialty>({
    name: "",
    description: "",
    active: true
  });
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
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

  // Generar sugerencias de búsqueda
  const getSearchSuggestions = () => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const allWords = specialties.flatMap(specialty => [
      ...specialty.name.toLowerCase().split(' '),
      ...specialty.description.toLowerCase().split(' ')
    ]).filter(word =>
      word.length > 2 &&
      word.includes(searchTerm.toLowerCase()) &&
      word !== searchTerm.toLowerCase()
    );

    const uniqueWords = [...new Set(allWords)];
    return uniqueWords.slice(0, 5); // Máximo 5 sugerencias
  };

  // Colores predefinidos para las especialidades
  const predefinedColors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
  ];
  // Función para filtrar y ordenar especialidades
  const filterAndSortSpecialties = (searchValue: string, status: string, sort: string) => {
    let filtered = [...specialties];

    // Filtro por texto de búsqueda (más avanzado)
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(specialty =>
        // Búsqueda en nombre
        specialty.name.toLowerCase().includes(searchLower) ||
        // Búsqueda en descripción
        specialty.description.toLowerCase().includes(searchLower) ||
        // Búsqueda por palabras individuales
        searchLower.split(' ').some(word =>
          word.length > 1 && (
            specialty.name.toLowerCase().includes(word) ||
            specialty.description.toLowerCase().includes(word)
          )
        ) ||
        // Búsqueda por coincidencia parcial al inicio de palabras
        specialty.name.toLowerCase().split(' ').some(word =>
          word.startsWith(searchLower)
        ) ||
        specialty.description.toLowerCase().split(' ').some(word =>
          word.startsWith(searchLower)
        )
      );
    }

    // Filtro por estado
    if (status !== "all") {
      filtered = filtered.filter(specialty =>
        status === "active" ? specialty.active : !specialty.active
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          return b.id - a.id; // Asumiendo que ID más alto = más reciente
        case "status":
          if (a.active === b.active) return a.name.localeCompare(b.name);
          return a.active ? -1 : 1; // Activas primero
        default:
          return 0;
      }
    });

    setFilteredSpecialties(filtered);
  };

  // Manejar cambios en el campo de búsqueda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    filterAndSortSpecialties(value, filterStatus, sortBy);
  };

  // Manejar cambios en el filtro de estado
  const handleStatusFilterChange = (status: "all" | "active" | "inactive") => {
    setFilterStatus(status);
    filterAndSortSpecialties(searchTerm, status, sortBy);
  };

  // Manejar cambios en el ordenamiento
  const handleSortChange = (sort: "name" | "recent" | "status") => {
    setSortBy(sort);
    filterAndSortSpecialties(searchTerm, filterStatus, sort);
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setSortBy("name");
    filterAndSortSpecialties("", "all", "name");
  };

  const fetchSpecialties = async () => {
    console.log('🔝 Fetching specialties...');
    try {
      const data = await apiService.specialties.list();
      console.log('📦 Specialties received:', data);
      setSpecialties(data);
      setFilteredSpecialties(data);
    } catch (error) {
      console.error('❌ Error fetching specialties:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las especialidades. Por favor, actualice la página.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);
  // Actualizar filtros cuando cambien las especialidades
  useEffect(() => {
    filterAndSortSpecialties(searchTerm, filterStatus, sortBy);
  }, [specialties]);

  const handleAddSpecialty = async () => {
    if (!newSpecialty.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la especialidad es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiService.specialties.create(newSpecialty);
      await fetchSpecialties();
      setNewSpecialty({
        name: "",
        description: "",
        active: true
      });
      setIsDialogOpen(false);

      toast({
        title: "Éxito",
        description: "Especialidad creada correctamente",
      });
    } catch (error) {
      console.error('❌ Error creating specialty:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la especialidad. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSpecialty = async () => {
    if (!editingSpecialty) return;
    if (!editingSpecialty.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la especialidad es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiService.specialties.update(editingSpecialty.id.toString(), {
        name: editingSpecialty.name,
        description: editingSpecialty.description,
        active: editingSpecialty.active
      });

      await fetchSpecialties();
      setIsDialogOpen(false);
      setEditingSpecialty(null);

      toast({
        title: "Éxito",
        description: "Especialidad actualizada correctamente",
      });
    } catch (error) {
      console.error('Error updating specialty:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la especialidad. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpecialty = async (id: number) => {
    try {
      await apiService.specialties.delete(id.toString());
      await fetchSpecialties();
      toast({
        title: "�xito",
        description: "Especialidad eliminada correctamente",
      });
    } catch (error: any) {
      console.error("Error deleting specialty:", error);
      if (error.message && error.message.includes('400')) {
        toast({
          title: "No se puede eliminar",
          description: "La especialidad est� siendo utilizada por personal activo",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar la especialidad",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Especialidades</h1>
          <p className="text-gray-600 text-sm mt-1">
            Administra las especialidades que pueden ser asignadas al personal
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Especialidad
        </Button>
      </div>      {/* Barra de búsqueda y filtros mejorada */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Campo de búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, descripción, palabras clave..."
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
                  className={`${(filterStatus !== "all" || sortBy !== "name") ? "bg-blue-50 border-blue-200" : ""}`}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {(filterStatus !== "all" || sortBy !== "name") && (
                    <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                      {(filterStatus !== "all" ? 1 : 0) + (sortBy !== "name" ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado</Label>
                    <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las especialidades</SelectItem>
                        <SelectItem value="active">Solo activas</SelectItem>
                        <SelectItem value="inactive">Solo inactivas</SelectItem>
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
                        <SelectItem value="recent">Más recientes</SelectItem>
                        <SelectItem value="status">Estado (activas primero)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(filterStatus !== "all" || sortBy !== "name" || searchTerm) && (
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
        <div className="mt-3 flex flex-wrap gap-2 items-center">
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
              Estado: {filterStatus === "active" ? "Activas" : "Inactivas"}
              <button
                onClick={() => handleStatusFilterChange("all")}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {sortBy !== "name" && (
            <Badge variant="secondary" className="text-xs">
              Orden: {sortBy === "recent" ? "Más recientes" : "Por estado"}
              <button
                onClick={() => handleSortChange("name")}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>        {/* Resultados de búsqueda */}
        <div className="mt-2 text-sm text-gray-600">
          {searchTerm || filterStatus !== "all" ? (
            <span>
              Mostrando {filteredSpecialties.length} de {specialties.length} especialidades
              {filteredSpecialties.length === 0 && specialties.length > 0 && " - intenta ajustar los filtros"}
            </span>
          ) : (
            <span>Total: {specialties.length} especialidades</span>
          )}
        </div>

        {/* Sugerencias rápidas de búsqueda */}
        {searchTerm && getSearchSuggestions().length > 0 && (
          <div className="mt-3">
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
      </div>

      {isFetching ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>      ) : filteredSpecialties.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {searchTerm || filterStatus !== "all" ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No se encontraron especialidades</p>
                <p className="text-sm mb-4">
                  No hay especialidades que coincidan con los filtros aplicados
                </p>
                <div className="space-y-2">
                  {searchTerm && (
                    <p className="text-xs text-gray-400">
                      Búsqueda actual: "{searchTerm}"
                    </p>
                  )}
                  {filterStatus !== "all" && (
                    <p className="text-xs text-gray-400">
                      Filtro de estado: {filterStatus === "active" ? "Solo activas" : "Solo inactivas"}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay especialidades</p>
                <p className="text-sm">Comienza creando tu primera especialidad</p>
              </>
            )}
          </div>
          {(searchTerm || filterStatus !== "all") ? (
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={clearAllFilters}>
                Limpiar filtros
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Especialidad
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Crear primera especialidad
            </Button>
          )}
        </div>
      ) : (        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredSpecialties.map((specialty, index) => (
            <Card key={specialty.id} className="flex flex-col hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: '#3B82F6' }}
                    />
                    <CardTitle className="text-lg">
                      {highlightMatch(specialty.name, searchTerm)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={specialty.active ? "default" : "secondary"}>
                      {specialty.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {specialty.description ?
                    highlightMatch(specialty.description, searchTerm) :
                    <span className="italic">Sin descripción</span>
                  }
                </p>

                {/* Información adicional */}
                <div className="text-xs text-gray-400 mb-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Número de especialidad:</span>
                    <span>#{specialty.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado de Especialidad:</span>
                    <span className={specialty.active ? "text-green-600" : "text-gray-500"}>
                      {specialty.active ? "✓ Activa" : "○ Inactiva"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSpecialty(specialty);
                      setIsDialogOpen(true);
                    }}
                    className="hover:bg-blue-50 hover:border-blue-200"
                  >
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                    onClick={() => handleDeleteSpecialty(specialty.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingSpecialty(null);
          setNewSpecialty({ name: "", description: "", active: true });
        }
        setIsDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpecialty ? 'Editar' : 'Nueva'} Especialidad</DialogTitle>
            <DialogDescription>
              {editingSpecialty ? 'Actualiza los datos de la especialidad.' : 'Ingresa los datos de la nueva especialidad.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la especialidad *</Label>
              <Input
                id="name"
                value={editingSpecialty ? editingSpecialty.name : newSpecialty.name}
                onChange={(e) => editingSpecialty ?
                  setEditingSpecialty({...editingSpecialty, name: e.target.value}) :
                  setNewSpecialty({...newSpecialty, name: e.target.value})
                }
                placeholder="Ej: Cardiología, Dermatología"
                disabled={loading}
              />
            </div>            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={editingSpecialty ? editingSpecialty.description : newSpecialty.description}
                onChange={(e) => editingSpecialty ?
                  setEditingSpecialty({...editingSpecialty, description: e.target.value}) :
                  setNewSpecialty({...newSpecialty, description: e.target.value})
                }
                placeholder="Descripción de la especialidad (opcional)"
                disabled={loading}
                rows={3}
              />
            </div>
            {editingSpecialty && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={editingSpecialty.active}
                  onCheckedChange={(checked) =>
                    setEditingSpecialty({...editingSpecialty, active: checked})
                  }
                />
                <Label htmlFor="active">Especialidad activa</Label>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingSpecialty(null);
                  setNewSpecialty({ name: "", description: "", active: true });
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingSpecialty ? handleEditSpecialty : handleAddSpecialty}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {editingSpecialty ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  editingSpecialty ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpecialtyManagement;
