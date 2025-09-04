import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { PlusIcon, Pencil, Trash, Loader2, Search, X } from "lucide-react";
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
import { useToast } from "./ui/use-toast";

interface ServiceCategory {
  id: number;
  name: string;
  description: string;
}

type NewCategory = Omit<ServiceCategory, "id">;

const CategoryManagement = () => {
  const { user } = useContext(AuthContext) || {};
  const { toast } = useToast();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ServiceCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [newCategory, setNewCategory] = useState<NewCategory>({
    name: "",
    description: ""
  });
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // Función para filtrar categorías
  const filterCategories = (searchValue: string) => {
    if (!searchValue.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.filter(category => 
      category.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      category.description.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredCategories(filtered);
  };

  // Manejar cambios en el campo de búsqueda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    filterCategories(value);
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchTerm("");
    setFilteredCategories(categories);
  };

  const fetchCategories = async () => {
    console.log('🔍 Fetching categories...');
    try {
      const empresa_id = user?.empresa_id || 1;
      const response = await fetch(`/api/service-categories?empresa_id=${empresa_id}`);
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', {
        'Content-Type': response.headers.get('Content-Type'),
        'Content-Length': response.headers.get('Content-Length')
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      console.log('📦 Categories received:', data);
      setCategories(data);
      setFilteredCategories(data);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      console.error('Stack:', error.stack);
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías. Por favor, actualice la página.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Actualizar filtros cuando cambien las categorías
  useEffect(() => {
    filterCategories(searchTerm);
  }, [categories]);

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      console.log('⚠️ Validation failed: name is required');
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      });
      return;
    }

    console.log('📝 Creating new category:', newCategory);
    setLoading(true);
    try {
      const response = await fetch('/api/service-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', {
        'Content-Type': response.headers.get('Content-Type'),
        'Content-Length': response.headers.get('Content-Length')
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const data = await response.json();
      console.log('📦 New category created:', data);

      await fetchCategories();
      setNewCategory({
        name: "",
        description: ""
      });
      setIsDialogOpen(false);
      
      toast({
        title: "Éxito",
        description: "Categoría creada correctamente",
      });
    } catch (error) {
      console.error('❌ Error creating category:', error);
      console.error('Stack:', error.stack);
      toast({
        title: "Error",
        description: "No se pudo crear la categoría. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/service-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingCategory.name,
          description: editingCategory.description
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      await fetchCategories();
      setIsDialogOpen(false);
      setEditingCategory(null);
      
      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const response = await fetch(`/api/service-categories/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete category');
      }
      
      await fetchCategories();
      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Gestión de Categorías</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar categorías por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Mostrando {filteredCategories.length} de {categories.length} categorías
          </div>
        )}
      </div>

      {isFetching ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {searchTerm ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No se encontraron categorías</p>
                <p className="text-sm">
                  No hay categorías que coincidan con "{searchTerm}"
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No hay categorías</p>
                <p className="text-sm">Comienza creando tu primera categoría</p>
              </>
            )}
          </div>
          {searchTerm && (
            <Button variant="outline" onClick={clearSearch}>
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingCategory(category);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {category.description || "Sin descripción"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingCategory(null);
          setNewCategory({ name: "", description: "" });
        }
        setIsDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Actualiza los datos de la categoría.' : 'Ingresa los datos de la nueva categoría.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la categoría *</Label>
              <Input 
                id="name" 
                value={editingCategory ? editingCategory.name : newCategory.name} 
                onChange={(e) => editingCategory ? 
                  setEditingCategory({...editingCategory, name: e.target.value}) :
                  setNewCategory({...newCategory, name: e.target.value})
                }
                placeholder="Ingrese el nombre de la categoría"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                value={editingCategory ? editingCategory.description : newCategory.description} 
                onChange={(e) => editingCategory ?
                  setEditingCategory({...editingCategory, description: e.target.value}) :
                  setNewCategory({...newCategory, description: e.target.value})
                }
                placeholder="Ingrese una descripción (opcional)"
                disabled={loading}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingCategory(null);
                  setNewCategory({ name: "", description: "" });
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingCategory ? handleEditCategory : handleAddCategory}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCategory ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  editingCategory ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagement;
