import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, User, Shield, AlertCircle, Key } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import UserTypeManagement from "./UserTypeManagement";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  createdAt: string;
  lastLogin: string;
}

export interface SupportCase {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'closed' | 'in_progress';
  createdAt: string;
}

const AdminManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [supportCases, setSupportCases] = useState<SupportCase[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/admins')
      .then(res => res.json())
      .then(data => setAdmins(data))
      .catch(err => console.error("Error fetching admins:", err));

    fetch('http://localhost:3001/api/support-cases')
      .then(res => res.json())
      .then(data => setSupportCases(data))
      .catch(err => console.error("Error fetching support cases:", err));
  }, []);

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as const
  });

  const [newCase, setNewCase] = useState({
    subject: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high"
  });

  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
  const [passwordChange, setPasswordChange] = useState({ current: "", new: "", confirm: "" });

  const handleAddAdmin = () => {
    fetch('http://localhost:3001/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAdmin)
    })
    .then(res => res.json())
    .then(addedAdmin => {
      const admin: AdminUser = {
        id: String(addedAdmin.id),
        name: addedAdmin.name,
        email: addedAdmin.email,
        role: "admin",
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: ""
      };
      setAdmins([...admins, admin]);
      setNewAdmin({ name: "", email: "", password: "", role: "admin" });
      setIsAdminDialogOpen(false);
      toast.success("Administrador agregado exitosamente");
    })
    .catch(err => {
      console.error("Error adding admin:", err);
      toast.error("Error al agregar administrador");
    });
  };

  const handleAddCase = () => {
    fetch('http://localhost:3001/api/support-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCase)
    })
    .then(res => res.json())
    .then(addedCase => {
      const supportCase: SupportCase = {
        id: String(addedCase.id),
        subject: addedCase.subject,
        description: addedCase.description,
        priority: addedCase.priority,
        status: "open",
        createdAt: new Date().toISOString().split('T')[0]
      };
      setSupportCases([...supportCases, supportCase]);
      setNewCase({ subject: "", description: "", priority: "medium" });
      setIsCaseDialogOpen(false);
      toast.success("Caso de soporte creado exitosamente");
    })
    .catch(err => {
      console.error("Error adding case:", err);
      toast.error("Error al crear caso de soporte");
    });
  };

  const handlePasswordChange = () => {
    if (passwordChange.new !== passwordChange.confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    toast.success("Contraseña actualizada exitosamente");
    setPasswordChange({ current: "", new: "", confirm: "" });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Gestión Administrativa
          </CardTitle>
        </CardHeader>
      </Card>      <Tabs defaultValue="admins" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="admins">Administradores</TabsTrigger>
          <TabsTrigger value="user-types">Tipos de Usuario</TabsTrigger>
          <TabsTrigger value="support">Soporte</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestionar Administradores</CardTitle>
                <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Administrador</DialogTitle>
                      <DialogDescription>
                        Completa los datos del nuevo administrador del sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="adminName">Nombre completo</Label>
                        <Input
                          id="adminName"
                          value={newAdmin.name}
                          onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                          placeholder="Nombre del administrador"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adminEmail">Email</Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          value={newAdmin.email}
                          onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                          placeholder="admin@empresa.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adminPassword">Contraseña temporal</Label>
                        <Input
                          id="adminPassword"
                          type="password"
                          value={newAdmin.password}
                          onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                          placeholder="Contraseña inicial"
                        />
                      </div>
                      <Button onClick={handleAddAdmin} className="w-full">
                        Crear Administrador
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map((admin) => (
                  <Card key={admin.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{admin.name}</h3>
                            <p className="text-sm text-gray-600">{admin.email}</p>
                            <Badge className="mt-1 bg-green-100 text-green-800">
                              Administrador
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                        <p>Creado: {admin.createdAt}</p>
                        {admin.lastLogin && <p>Último acceso: {admin.lastLogin}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>        </TabsContent>

        <TabsContent value="user-types" className="space-y-6">
          <UserTypeManagement />
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Casos de Soporte</CardTitle>
                <Dialog open={isCaseDialogOpen} onOpenChange={setIsCaseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Caso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Caso de Soporte</DialogTitle>
                      <DialogDescription>
                        Registra un nuevo caso o incidencia del sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="caseSubject">Asunto</Label>
                        <Input
                          id="caseSubject"
                          value={newCase.subject}
                          onChange={(e) => setNewCase({...newCase, subject: e.target.value})}
                          placeholder="Describe el problema brevemente"
                        />
                      </div>
                      <div>
                        <Label>Prioridad</Label>
                        <Select value={newCase.priority} onValueChange={(value: "low" | "medium" | "high") => setNewCase({...newCase, priority: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="caseDescription">Descripción detallada</Label>
                        <Textarea
                          id="caseDescription"
                          value={newCase.description}
                          onChange={(e) => setNewCase({...newCase, description: e.target.value})}
                          placeholder="Describe el problema en detalle..."
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleAddCase} className="w-full">
                        Crear Caso
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supportCases.map((supportCase) => (
                  <Card key={supportCase.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <h3 className="font-semibold">{supportCase.subject}</h3>
                            <Badge className={getPriorityColor(supportCase.priority)}>
                              {supportCase.priority === 'high' ? 'Alta' : 
                               supportCase.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{supportCase.description}</p>
                          <p className="text-xs text-gray-500">Creado: {supportCase.createdAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={supportCase.status === 'open' ? 'destructive' : 'default'}>
                            {supportCase.status === 'open' ? 'Abierto' : 'Cerrado'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Cambiar Contraseña
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordChange.current}
                    onChange={(e) => setPasswordChange({...passwordChange, current: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordChange.new}
                    onChange={(e) => setPasswordChange({...passwordChange, new: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordChange.confirm}
                    onChange={(e) => setPasswordChange({...passwordChange, confirm: e.target.value})}
                  />
                </div>
                <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                  Actualizar Contraseña
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManagement;
