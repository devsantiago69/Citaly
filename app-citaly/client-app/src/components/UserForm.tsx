import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface UserType {
  id: number;
  name: string;
  level: string;
  description: string;
  active: boolean;
}

interface UserFormProps {
  onSubmit: (userData: any) => void;
  loading: boolean;
  user?: any;
  onCancel: () => void;
}

const UserForm = ({ onSubmit, loading, user, onCancel }: UserFormProps) => {
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    document_type: "RUT",
    document_number: "",
    user_type_id: "",
    role: "",
    status: "active"
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchUserTypes();
  }, []);
  useEffect(() => {
    if (user) {
      // Split the name into first_name and last_name if it exists
      const nameParts = user.name ? user.name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        first_name: firstName,
        last_name: lastName,
        email: user.email || "",
        password: "",
        phone: user.phone || "",
        document_type: user.document_type || "RUT",
        document_number: user.document_number || "",
        user_type_id: user.user_type_id?.toString() || "",
        role: user.role || "",
        status: user.status || "active"
      });
    }
  }, [user]);

  const fetchUserTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-types`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setUserTypes(data.filter((userType: UserType) => userType.active));
    } catch (error) {
      console.error("Error fetching user types:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleUserTypeChange = (userTypeId: string) => {
    const selectedUserType = userTypes.find(ut => ut.id.toString() === userTypeId);
    if (selectedUserType) {
      setFormData(prev => ({
        ...prev,
        user_type_id: userTypeId,
        role: selectedUserType.level
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "El nombre es requerido";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "El apellido es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = "La contraseña es requerida";
    } else if (!user && formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es requerido";
    }

    if (!formData.document_number.trim()) {
      newErrors.document_number = "El número de documento es requerido";
    }

    if (!formData.user_type_id) {
      newErrors.user_type_id = "Debe seleccionar un tipo de usuario";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
      user_type_id: parseInt(formData.user_type_id),
    };

    // Remove first_name and last_name as they are combined into name
    delete submitData.first_name;
    delete submitData.last_name;

    // Don't send empty password for updates
    if (user && !formData.password.trim()) {
      delete submitData.password;
    }

    onSubmit(submitData);
  };

  const selectedUserType = userTypes.find(ut => ut.id.toString() === formData.user_type_id);

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Ingrese el nombre"
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Ingrese el apellido"
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="usuario@ejemplo.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {user ? "Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder={user ? "Nueva contraseña" : "Ingrese la contraseña"}
                  className={errors.password ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+56 9 1234 5678"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">Tipo de Documento</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value) => handleInputChange("document_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUT">RUT</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="CI">Cédula de Identidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_number">Número de Documento *</Label>
                <Input
                  id="document_number"
                  value={formData.document_number}
                  onChange={(e) => handleInputChange("document_number", e.target.value)}
                  placeholder="12.345.678-9"
                  className={errors.document_number ? "border-red-500" : ""}
                />
                {errors.document_number && (
                  <p className="text-sm text-red-500">{errors.document_number}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user_type_id">Tipo de Usuario *</Label>
              <Select
                value={formData.user_type_id}
                onValueChange={handleUserTypeChange}
              >
                <SelectTrigger className={errors.user_type_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione un tipo de usuario" />
                </SelectTrigger>
                <SelectContent>
                  {userTypes.map((userType) => (
                    <SelectItem key={userType.id} value={userType.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{userType.name}</span>
                        <span className="text-sm text-gray-500">{userType.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.user_type_id && (
                <p className="text-sm text-red-500">{errors.user_type_id}</p>
              )}
              {selectedUserType && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Rol asignado:</strong> {selectedUserType.level}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedUserType.description}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Guardando..." : user ? "Actualizar Usuario" : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
