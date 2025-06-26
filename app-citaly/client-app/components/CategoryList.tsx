import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  color: string;
}

interface CategoryListProps {
  categories: ServiceCategory[];
  onSelect: (categoryId: number) => void;
  onAddCategory: (category: Omit<ServiceCategory, "id">) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

export function CategoryList({ categories, onSelect, onAddCategory, onDeleteCategory }: CategoryListProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#000000"
  });

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onAddCategory(newCategory);
      setNewCategory({
        name: "",
        description: "",
        color: "#000000"
      });
      setIsDialogOpen(false);
      toast({
        title: "Éxito",
        description: "Categoría creada correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await onDeleteCategory(id);
      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Categorías</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
        {categories.map((category) => (
          <Card 
            key={category.id} 
            className="cursor-pointer hover:bg-accent"
            onClick={() => onSelect(category.id)}
          >
            <CardContent className="p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(category.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
            <DialogDescription>
              Añade una nueva categoría para los servicios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  disabled={loading}
                  className="w-20 h-10 p-1"
                />
                <Input
                  type="text"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  disabled={loading}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={loading}
              onClick={handleAddCategory}
            >
              {loading ? "Creando..." : "Crear Categoría"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
