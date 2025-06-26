import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { User, Building, Mail, Phone, MapPin, Edit2, Save, X } from 'lucide-react';

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: {
      name: user?.company?.name || '',
      nit: user?.company?.nit || '',
      address: user?.company?.address || '',
      phone: user?.company?.phone || '',
      email: user?.company?.email || ''
    }
  });

  const handleSave = () => {
    updateUser({
      name: formData.name,
      email: formData.email,
      company: formData.company
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      company: {
        name: user?.company?.name || '',
        nit: user?.company?.nit || '',
        address: user?.company?.address || '',
        phone: user?.company?.phone || '',
        email: user?.company?.email || ''
      }
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
          <p className="text-gray-600">Gestiona tu información personal y de empresa</p>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Datos del administrador del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo
              </label>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nombre completo"
                />
              ) : (
                <p className="text-gray-900">{user?.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="correo@ejemplo.com"
                />
              ) : (
                <p className="text-gray-900">{user?.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <p className="text-gray-900 capitalize">{user?.role}</p>
            </div>
          </CardContent>
        </Card>

        {/* Información de la Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Información de la Empresa
            </CardTitle>
            <CardDescription>
              Datos de tu empresa o negocio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la empresa
              </label>
              {isEditing ? (
                <Input
                  value={formData.company.name}
                  onChange={(e) => setFormData({
                    ...formData, 
                    company: {...formData.company, name: e.target.value}
                  })}
                  placeholder="Nombre de la empresa"
                />
              ) : (
                <p className="text-gray-900">{user?.company?.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIT
              </label>
              {isEditing ? (
                <Input
                  value={formData.company.nit}
                  onChange={(e) => setFormData({
                    ...formData, 
                    company: {...formData.company, nit: e.target.value}
                  })}
                  placeholder="123.456.789-0"
                />
              ) : (
                <p className="text-gray-900">{user?.company?.nit}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Dirección
              </label>
              {isEditing ? (
                <Input
                  value={formData.company.address}
                  onChange={(e) => setFormData({
                    ...formData, 
                    company: {...formData.company, address: e.target.value}
                  })}
                  placeholder="Dirección completa"
                />
              ) : (
                <p className="text-gray-900">{user?.company?.address}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Teléfono
              </label>
              {isEditing ? (
                <Input
                  value={formData.company.phone}
                  onChange={(e) => setFormData({
                    ...formData, 
                    company: {...formData.company, phone: e.target.value}
                  })}
                  placeholder="+57 300 123 4567"
                />
              ) : (
                <p className="text-gray-900">{user?.company?.phone}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email empresarial
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.company.email}
                  onChange={(e) => setFormData({
                    ...formData, 
                    company: {...formData.company, email: e.target.value}
                  })}
                  placeholder="info@empresa.com"
                />
              ) : (
                <p className="text-gray-900">{user?.company?.email}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProfile;
