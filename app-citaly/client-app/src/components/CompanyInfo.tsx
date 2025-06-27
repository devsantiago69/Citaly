import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { Building, MapPin, Phone, Mail, FileText, Edit2, Save, X } from 'lucide-react';

const CompanyInfo = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company: {
      name: user?.company?.name || '',
      nit: user?.company?.nit || '',
      address: user?.company?.address || '',
      phone: user?.company?.phone || '',
      email: user?.company?.email || '',
      description: user?.company?.description || '',
      website: user?.company?.website || '',
      industry: user?.company?.industry || ''
    }
  });

  const handleSave = () => {
    updateUser({
      company: {
        ...user?.company,
        ...formData.company
      }
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      company: {
        name: user?.company?.name || '',
        nit: user?.company?.nit || '',
        address: user?.company?.address || '',
        phone: user?.company?.phone || '',
        email: user?.company?.email || '',
        description: user?.company?.description || '',
        website: user?.company?.website || '',
        industry: user?.company?.industry || ''
      }
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Información de la Empresa</h2>
          <p className="text-gray-600">Gestiona los datos corporativos de tu empresa</p>
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
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Datos Básicos
            </CardTitle>
            <CardDescription>
              Información fundamental de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre de la empresa</Label>
              {isEditing ? (
                <Input
                  value={formData.company.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, name: e.target.value }
                  })}
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.name || 'No especificado'}</p>
              )}
            </div>

            <div>
              <Label>NIT</Label>
              {isEditing ? (
                <Input
                  value={formData.company.nit}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, nit: e.target.value }
                  })}
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.nit || 'No especificado'}</p>
              )}
            </div>

            <div>
              <Label>Sector/Industria</Label>
              {isEditing ? (
                <Input
                  value={formData.company.industry}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, industry: e.target.value }
                  })}
                  placeholder="Ej: Salud y Bienestar"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.industry || 'No especificado'}</p>
              )}
            </div>

            <div>
              <Label>Sitio Web</Label>
              {isEditing ? (
                <Input
                  value={formData.company.website}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, website: e.target.value }
                  })}
                  placeholder="https://www.ejemplo.com"
                />
              ) : (
                <p className="text-gray-900 font-medium">
                  {user?.company?.website ? (
                    <a href={user.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {user.company.website}
                    </a>
                  ) : (
                    'No especificado'
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Información de Contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Información de Contacto
            </CardTitle>
            <CardDescription>
              Datos de contacto de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </Label>
              {isEditing ? (
                <Textarea
                  value={formData.company.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, address: e.target.value }
                  })}
                  rows={2}
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.address || 'No especificado'}</p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              {isEditing ? (
                <Input
                  value={formData.company.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, phone: e.target.value }
                  })}
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.phone || 'No especificado'}</p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Corporativo
              </Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.company.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, email: e.target.value }
                  })}
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.email || 'No especificado'}</p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descripción
              </Label>
              {isEditing ? (
                <Textarea
                  value={formData.company.description}
                  onChange={(e) => setFormData({
                    ...formData,
                    company: { ...formData.company, description: e.target.value }
                  })}
                  rows={3}
                  placeholder="Breve descripción de la empresa y sus servicios"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user?.company?.description || 'No especificado'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyInfo;
