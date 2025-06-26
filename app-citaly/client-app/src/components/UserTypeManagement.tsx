import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Shield, UserCheck, Stethoscope, Phone, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";

interface UserType {
  id: number;
  company_id: number;
  name: string;
  description: string;
  permissions: {
    appointments?: { read: boolean; write: boolean; delete: boolean };
    users?: { read: boolean; write: boolean; delete: boolean };
    reports?: { read: boolean; write: boolean; delete: boolean };
    billing?: { read: boolean; write: boolean; delete: boolean };
    settings?: { read: boolean; write: boolean; delete: boolean };
  };
  level: 'admin' | 'staff' | 'client';
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
}

const USER_TYPE_ICONS = {
  admin: Shield,
  staff: UserCheck,
  client: UserIcon,
};

const USER_TYPE_COLORS = {
  admin: "bg-red-100 text-red-800",
  staff: "bg-blue-100 text-blue-800",
  client: "bg-green-100 text-green-800",
};

const PERMISSION_MODULES = [
  { key: 'appointments', label: 'Citas', description: 'Gestión de citas y calendario' },
  { key: 'users', label: 'Usuarios', description: 'Gestión de usuarios y perfiles' },
  { key: 'reports', label: 'Reportes', description: 'Visualización de reportes' },
  { key: 'billing', label: 'Facturación', description: 'Gestión de facturación y pagos' },
  { key: 'settings', label: 'Configuración', description: 'Configuración del sistema' },
];

const UserTypeManagement = () => {
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: "staff" as "admin" | "staff" | "client",
    permissions: {} as UserType['permissions']
  });

  useEffect(() => {
    fetchUserTypes();
  }, []);

  const fetchUserTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-types`);
      if (!response.ok) {
        throw new Error('Error al cargar tipos de usuario');
      }
      const data = await response.json();
      setUserTypes(data);
    } catch (error) {
      console.error("Error fetching user types:", error);
      toast.error("Error al cargar tipos de usuario");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      level: "staff",
      permissions: {}
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsEditMode(false);
    setSelectedUserType(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (userType: UserType) => {
    setFormData({
      name: userType.name,
      description: userType.description,
      level: userType.level,
      permissions: userType.permissions || {}
    });
    setSelectedUserType(userType);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      const url = isEditMode && selectedUserType 
        ? `${API_BASE_URL}/api/user-types/${selectedUserType.id}`
        : `${API_BASE_URL}/api/user-types`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          level: formData.level,
          permissions: formData.permissions,
          company_id: 1 // For now, hardcode company_id
        }),
      });

      if (!response.ok) {
        throw new Error(isEditMode ? 'Error al actualizar tipo de usuario' : 'Error al crear tipo de usuario');
      }

      await fetchUserTypes();
      setIsDialogOpen(false);
      resetForm();
      toast.success(isEditMode ? "Tipo de usuario actualizado exitosamente" : "Tipo de usuario creado exitosamente");
    } catch (error) {
      console.error("Error saving user type:", error);
      toast.error(isEditMode ? "Error al actualizar tipo de usuario" : "Error al crear tipo de usuario");
    }
  };

  const handleDelete = async (userType: UserType) => {
    if (!confirm(`¿Está seguro de que desea eliminar el tipo de usuario "${userType.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/user-types/${userType.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar tipo de usuario');
      }

      await fetchUserTypes();
      toast.success("Tipo de usuario eliminado exitosamente");
    } catch (error: any) {
      console.error("Error deleting user type:", error);
      toast.error(error.message || "Error al eliminar tipo de usuario");
    }
  };

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module as keyof typeof prev.permissions],
          [action]: checked
        }
      }
    }));
  };

  const getLevelIcon = (level: string) => {
    const IconComponent = USER_TYPE_ICONS[level as keyof typeof USER_TYPE_ICONS] || UserIcon;
    return <IconComponent className="h-5 w-5" />;
  };

  const getLevelColor = (level: string) => {
    return USER_TYPE_COLORS[level as keyof typeof USER_TYPE_COLORS] || "bg-gray-100 text-gray-800";
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'admin': return 'Administrador';
      case 'staff': return 'Personal';
      case 'client': return 'Cliente';
      default: return level;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Gestión de Tipos de Usuario
            </CardTitle>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando tipos de usuario...</div>
          ) : userTypes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTypes.map((userType) => (
                <Card key={userType.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {getLevelIcon(userType.level)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{userType.name}</h3>
                          <Badge className={getLevelColor(userType.level)}>
                            {getLevelLabel(userType.level)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(userType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => handleDelete(userType)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{userType.description}</p>
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-500 uppercase">Permisos</h4>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(userType.permissions || {}).map(([module, perms]) => {
                          const hasPermissions = perms && (perms.read || perms.write || perms.delete);
                          if (!hasPermissions) return null;
                          
                          return (
                            <Badge key={module} variant="outline" className="text-xs">
                              {PERMISSION_MODULES.find(m => m.key === module)?.label || module}
                            </Badge>
                          );
                        })}
                        {!Object.keys(userType.permissions || {}).length && (
                          <span className="text-xs text-gray-400">Sin permisos configurados</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      <p>Creado: {new Date(userType.created_at).toLocaleDateString()}</p>
                      <Badge variant={userType.active ? "default" : "secondary"} className="mt-1">
                        {userType.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay tipos de usuario configurados.</p>
              <p className="text-sm">Cree el primer tipo de usuario para comenzar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Editar Tipo de Usuario' : 'Nuevo Tipo de Usuario'}
            </DialogTitle>
            <DialogDescription>
              Configure los permisos y características del tipo de usuario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Secretaria"
                />
              </div>
              
              <div>
                <Label htmlFor="level">Nivel</Label>
                <Select value={formData.level} onValueChange={(value: "admin" | "staff" | "client") => 
                  setFormData(prev => ({ ...prev, level: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="staff">Personal</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del tipo de usuario y sus responsabilidades"
                rows={3}
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-4">Permisos del Sistema</h4>
              <div className="space-y-4">
                {PERMISSION_MODULES.map((module) => (
                  <div key={module.key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-medium">{module.label}</h5>
                        <p className="text-sm text-gray-600">{module.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-read`}
                          checked={formData.permissions[module.key as keyof typeof formData.permissions]?.read || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'read', checked as boolean)
                          }
                        />
                        <Label htmlFor={`${module.key}-read`} className="text-sm">Leer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-write`}
                          checked={formData.permissions[module.key as keyof typeof formData.permissions]?.write || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'write', checked as boolean)
                          }
                        />
                        <Label htmlFor={`${module.key}-write`} className="text-sm">Escribir</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-delete`}
                          checked={formData.permissions[module.key as keyof typeof formData.permissions]?.delete || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'delete', checked as boolean)
                          }
                        />
                        <Label htmlFor={`${module.key}-delete`} className="text-sm">Eliminar</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {isEditMode ? 'Actualizar' : 'Crear'} Tipo de Usuario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserTypeManagement;
