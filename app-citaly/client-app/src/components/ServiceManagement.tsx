import { useEffect, useState } from "react";
import { Plus, Search, Clock, DollarSign, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/use-toast";
import { api } from "../config/api";

interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  color: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  category_id: number;
  active: boolean;
}

type NewService = Omit<Service, "id">;

const ServiceManagement = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const initialServiceState: NewService = {
    name: "",
    description: "",
    duration: 60,
    price: 0,
    category: "",
    category_id: 1,
    active: true
  };

  const [newService, setNewService] = useState<NewService>(initialServiceState);
  const [isFetching, setIsFetching] = useState(true);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/api/services/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive",
      });
    }
  };

  const fetchServices = async () => {
    try {
      const data = await api.get('/api/services');
      setServices(data.servicios || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchCategories(), fetchServices()]);
  }, []);

  const handleSaveService = async () => {
    // Validar campos requeridos y formatos
    if (!newService.name.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese el nombre del servicio",
        variant: "destructive",
      });
      return;
    }
    
    if (!newService.category_id) {
      toast({
        title: "Error",
        description: "Por favor seleccione una categoría",
        variant: "destructive",
      });
      return;
    }

    if (newService.duration <= 0) {
      toast({
        title: "Error",
        description: "La duración debe ser mayor a 0 minutos",
        variant: "destructive",
      });
      return;
    }

    if (newService.price < 0) {
      toast({
        title: "Error",
        description: "El precio no puede ser negativo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const isEditing = editingServiceId !== null;
      let response;
      if (isEditing) {
        response = await api.put(`/api/services/${editingServiceId}`, newService);
      } else {
        response = await api.post('/api/services', newService);
      }

      await fetchServices();

      // Mostrar el mensaje real del backend si existe
      toast({
        title: "Éxito",
        description: response?.message || (isEditing ? "Servicio actualizado correctamente" : "Servicio creado correctamente"),
      });

      setNewService(initialServiceState);
      setEditingServiceId(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el servicio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    try {
      await api.delete(`/api/services/${id}`);
      await fetchServices();
      toast({
        title: "Éxito",
        description: "Servicio eliminado correctamente",
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "belleza":
        return "bg-pink-100 text-pink-800";
      case "salud":
        return "bg-blue-100 text-blue-800";
      case "dental":
        return "bg-cyan-100 text-cyan-800";
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

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold text-blue-900 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-700 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
            Gestión de Servicios
          </h2>
          <Button onClick={() => setIsDialogOpen(true)} size="lg" className="bg-gradient-to-tr from-green-400 to-blue-600 hover:from-green-500 hover:to-blue-700 text-white font-bold shadow-lg flex items-center gap-2 px-6 py-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Servicio
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
            <Input
              placeholder="Buscar servicios por nombre, descripción, categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 bg-white shadow-sm"
            />
          </div>
        </div>
      </div>

      {isFetching ? (
        <div className="flex justify-center items-center h-32">
          <p className="text-blue-600 font-semibold animate-pulse">Cargando servicios...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">No hay servicios disponibles</p>
        </div>
      ) : services.filter(service => 
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.price.toString().includes(searchTerm) ||
          service.duration.toString().includes(searchTerm)
        ).length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">No se encontraron servicios que coincidan con la búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services
            .filter(service => 
              service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
              service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
              service.price.toString().includes(searchTerm) ||
              service.duration.toString().includes(searchTerm)
            )
            .map((service) => (
              <div key={service.id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between border border-blue-100 hover:shadow-2xl transition-shadow duration-200">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(service.category) + " px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full shadow-sm"}>
                      <span className="inline-block align-middle mr-1"><DollarSign className="w-4 h-4 inline-block text-blue-400" /></span>
                      {service.category}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-xl text-blue-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" /> {service.name}
                  </h3>
                  <p className="text-gray-600 mt-2 mb-4 min-h-[48px]">{service.description}</p>
                  <div className="flex flex-wrap gap-3 mb-2">
                    <Badge variant="secondary" className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200">
                      <Clock className="h-4 w-4" /> {service.duration} min
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-200">
                      <DollarSign className="h-4 w-4" /> {formatPrice(service.price)}
                    </Badge>
                    {service.active ? (
                      <Badge className="bg-green-100 text-green-800 border border-green-200">Activo</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border border-red-200">Inactivo</Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-full px-4 py-2 transition"
                    title="Editar servicio"
                    onClick={() => {
                      setEditingServiceId(service.id);
                      setNewService({
                        name: service.name,
                        description: service.description,
                        duration: service.duration,
                        price: service.price,
                        category: service.category,
                        category_id: service.category_id,
                        active: service.active
                      });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="h-5 w-5" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-800 rounded-full px-4 py-2 transition"
                    title="Eliminar servicio"
                    onClick={() => handleDeleteService(service.id)}
                  >
                    <Trash2 className="h-5 w-5" /> Eliminar
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setNewService(initialServiceState);
            setEditingServiceId(null);
            setIsDialogOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl shadow-2xl border border-blue-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-900 text-2xl font-bold">
              {editingServiceId ? (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 0 1 2.651 2.651l-2.02 8.08a2.25 2.25 0 0 1-1.591 1.591l-8.08 2.02a2.25 2.25 0 0 1-2.651-2.651l2.02-8.08a2.25 2.25 0 0 1 1.591-1.591l8.08-2.02z" />
                  </svg>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-green-400 to-blue-600 shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
              )}
              {editingServiceId ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
            </DialogTitle>
            <DialogDescription className="text-blue-700">
              {editingServiceId ? 'Modifica los datos del servicio.' : 'Completa los datos del nuevo servicio.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="font-semibold text-blue-800 flex items-center gap-1"><Edit className="w-4 h-4 text-blue-400" /> Nombre del servicio</Label>
              <Input 
                id="name" 
                value={newService.name} 
                onChange={(e) => setNewService({...newService, name: e.target.value})}
                disabled={loading}
                placeholder="Ej: Corte de cabello"
                className="rounded-lg border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description" className="font-semibold text-blue-800 flex items-center gap-1"><Search className="w-4 h-4 text-blue-400" /> Descripción</Label>
              <Textarea 
                id="description" 
                value={newService.description} 
                onChange={(e) => setNewService({...newService, description: e.target.value})}
                disabled={loading}
                placeholder="Describe el servicio..."
                className="rounded-lg border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="duration" className="font-semibold text-blue-800 flex items-center gap-1"><Clock className="w-4 h-4 text-blue-400" /> Duración (min)</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  value={newService.duration} 
                  onChange={(e) => setNewService({...newService, duration: parseInt(e.target.value) || 0})}
                  disabled={loading}
                  min={0}
                  className="rounded-lg border-blue-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price" className="font-semibold text-blue-800 flex items-center gap-1"><DollarSign className="w-4 h-4 text-green-400" /> Precio</Label>
                <Input 
                  id="price" 
                  type="number" 
                  value={newService.price} 
                  onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value) || 0})}
                  disabled={loading}
                  min={0}
                  className="rounded-lg border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="category" className="font-semibold text-blue-800 flex items-center gap-1"><Badge className="w-4 h-4 bg-blue-200 text-blue-700" /> Categoría</Label>
              <Select
                value={newService.category_id ? newService.category_id.toString() : ''}
                onValueChange={(value) => {
                  const categoryId = parseInt(value);
                  const selectedCategory = categories.find(c => c.id === categoryId);
                  if (selectedCategory) {
                    setNewService({
                      ...newService,
                      category_id: categoryId,
                      category: selectedCategory.name
                    });
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger className="rounded-lg border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()} className="flex items-center gap-2">
                      <Badge className="w-3 h-3 bg-blue-200 text-blue-700 mr-2" /> {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" className="rounded-lg" onClick={() => {
                setIsDialogOpen(false);
                setNewService(initialServiceState);
                setEditingServiceId(null);
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveService} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md"
              >
                {loading ? 'Guardando...' : (editingServiceId ? 'Actualizar' : 'Agregar')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceManagement;