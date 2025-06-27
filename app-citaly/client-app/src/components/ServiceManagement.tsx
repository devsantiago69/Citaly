import { useEffect, useState } from "react";
import { Plus, Search, Clock, DollarSign, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/config/api";

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
      const data = await api.get('/api/service-categories');
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
      setServices(data);
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
      if (isEditing) {
        await api.put(`/api/services/${editingServiceId}`, newService);
      } else {
        await api.post('/api/services', newService);
      }

      await fetchServices();
      
      toast({
        title: "Éxito",
        description: isEditing ? "Servicio actualizado correctamente" : "Servicio creado correctamente",
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
    <div className="p-6">      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestión de Servicios</h2>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar servicios por nombre, descripción, categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </div>
      </div>

      {isFetching ? (
        <div className="flex justify-center items-center h-32">
          <p>Cargando servicios...</p>
        </div>      ) : services.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay servicios disponibles</p>
        </div>
      ) : services.filter(service => 
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.price.toString().includes(searchTerm) ||
          service.duration.toString().includes(searchTerm)
        ).length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron servicios que coincidan con la búsqueda</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Servicios</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services
                .filter(service => 
                  service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  service.price.toString().includes(searchTerm) ||
                  service.duration.toString().includes(searchTerm)
                )
                .map((service) => (
                <Card key={service.id} className="mb-4">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration} min
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(service.price)}
                          </Badge>
                          <Badge className={getCategoryColor(service.category)}>
                            {service.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 border-t pt-4">                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
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
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex items-center gap-2"
                        onClick={() => handleDeleteService(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setNewService(initialServiceState);
            setEditingServiceId(null);
            setIsDialogOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingServiceId ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}</DialogTitle>
            <DialogDescription>
              {editingServiceId ? 'Modifica los datos del servicio.' : 'Completa los datos del nuevo servicio.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del servicio</Label>
              <Input 
                id="name" 
                value={newService.name} 
                onChange={(e) => setNewService({...newService, name: e.target.value})}
                disabled={loading}
                placeholder="Ej: Corte de cabello"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                value={newService.description} 
                onChange={(e) => setNewService({...newService, description: e.target.value})}
                disabled={loading}
                placeholder="Describe el servicio..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (min)</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  value={newService.duration} 
                  onChange={(e) => setNewService({...newService, duration: parseInt(e.target.value) || 0})}
                  disabled={loading}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input 
                  id="price" 
                  type="number" 
                  value={newService.price} 
                  onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value) || 0})}
                  disabled={loading}
                  min={0}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={newService.category_id.toString()}
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false);
                setNewService(initialServiceState);
                setEditingServiceId(null);
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveService} 
                disabled={loading}
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