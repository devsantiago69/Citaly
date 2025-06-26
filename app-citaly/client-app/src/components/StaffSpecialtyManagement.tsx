import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star, Award, User, CheckCircle2, Shield } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { useToast } from "./ui/use-toast";

interface Specialty {
  id: number;
  name: string;
  description: string;
  color: string;
  active: boolean;
}

interface StaffSpecialty {
  assignment_id: number;
  id: number;
  name: string;
  description: string;
  color: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number;
  certification_info: string;
  is_primary: boolean;
}

interface StaffSpecialtyManagementProps {
  staffId: number;
  staffName: string;
  isOpen: boolean;
  onClose: () => void;
}

const StaffSpecialtyManagement = ({ staffId, staffName, isOpen, onClose }: StaffSpecialtyManagementProps) => {
  const { toast } = useToast();
  const [staffSpecialties, setStaffSpecialties] = useState<StaffSpecialty[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StaffSpecialty | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    specialtyId: "",
    proficiencyLevel: "intermediate" as const,
    yearsExperience: 0,
    certificationInfo: "",
    isPrimary: false
  });

  const proficiencyLevels = {
    beginner: { label: "Principiante", color: "bg-gray-100 text-gray-800" },
    intermediate: { label: "Intermedio", color: "bg-blue-100 text-blue-800" },
    advanced: { label: "Avanzado", color: "bg-green-100 text-green-800" },
    expert: { label: "Experto", color: "bg-purple-100 text-purple-800" }
  };  const fetchStaffSpecialties = async () => {
    try {
      const response = await fetch(`/api/staff/${staffId}/specialties`);
      if (!response.ok) throw new Error('Failed to fetch staff specialties');
      
      const data = await response.json();
      
      // Validar que cada specialty tenga los campos necesarios
      const validatedData = data.map((specialty: any) => ({
        ...specialty,
        assignment_id: specialty.assignment_id || null,
        years_experience: specialty.years_experience || 0,
        certification_info: specialty.certification_info || '',
        proficiency_level: specialty.proficiency_level || 'intermediate',
        name: String(specialty.name).trim() // Asegurar que el nombre sea string y sin espacios extra
      }));
      
      setStaffSpecialties(validatedData);
    } catch (error) {
      console.error('Error fetching staff specialties:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las especialidades del staff",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties');
      if (!response.ok) throw new Error('Failed to fetch specialties');
      
      const data = await response.json();
      setAvailableSpecialties(data.filter((s: Specialty) => s.active));
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  useEffect(() => {
    if (isOpen && staffId) {
      fetchStaffSpecialties();
      fetchAvailableSpecialties();
    }
  }, [isOpen, staffId]);

  const handleAssignSpecialty = async () => {
    if (!newAssignment.specialtyId) {
      toast({
        title: "Error",
        description: "Debe seleccionar una especialidad",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/staff/${staffId}/specialties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          specialtyId: parseInt(newAssignment.specialtyId),
          proficiencyLevel: newAssignment.proficiencyLevel,
          yearsExperience: newAssignment.yearsExperience,
          certificationInfo: newAssignment.certificationInfo,
          isPrimary: newAssignment.isPrimary
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign specialty');
      }

      await fetchStaffSpecialties();
      setNewAssignment({
        specialtyId: "",
        proficiencyLevel: "intermediate",
        yearsExperience: 0,
        certificationInfo: "",
        isPrimary: false
      });
      setIsAssignDialogOpen(false);
      
      toast({
        title: "Éxito",
        description: "Especialidad asignada correctamente",
      });
    } catch (error: any) {
      console.error('Error assigning specialty:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar la especialidad",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateAssignment = async () => {
    console.log('🔍 handleUpdateAssignment called');
    console.log('🔍 editingAssignment:', editingAssignment);
    console.log('🔍 assignment_id:', editingAssignment?.assignment_id);
    
    if (!editingAssignment || !editingAssignment.assignment_id) {
      console.error('❌ Missing assignment_id or editingAssignment is null');
      toast({
        title: "Error",
        description: "No se pudo identificar la asignación a actualizar.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/staff/${staffId}/specialties/${editingAssignment.assignment_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proficiencyLevel: editingAssignment.proficiency_level,
          yearsExperience: editingAssignment.years_experience,
          certificationInfo: editingAssignment.certification_info,
          isPrimary: editingAssignment.is_primary
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update specialty assignment');
      }

      await fetchStaffSpecialties();
      setIsEditDialogOpen(false);
      setEditingAssignment(null);
      
      toast({
        title: "Éxito",
        description: "Especialidad actualizada correctamente",
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la especialidad",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSpecialty = async (assignmentId: number) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/specialties/${assignmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove specialty');
      }

      await fetchStaffSpecialties();
      toast({
        title: "Éxito",
        description: "Especialidad removida correctamente",
      });
    } catch (error) {
      console.error('Error removing specialty:', error);
      toast({
        title: "Error",
        description: "No se pudo remover la especialidad",
        variant: "destructive",
      });
    }
  };

  const getAvailableSpecialtiesForAssignment = () => {
    const assignedSpecialtyIds = staffSpecialties.map(s => s.id);
    return availableSpecialties.filter(s => !assignedSpecialtyIds.includes(s.id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Especialidades de {staffName}
          </DialogTitle>
          <DialogDescription>
            Gestiona las especialidades y nivel de competencia del miembro del staff
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header con botón para agregar */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Especialidades Asignadas</h3>
              <p className="text-sm text-gray-600">
                {staffSpecialties.length} especialidad{staffSpecialties.length !== 1 ? 'es' : ''} asignada{staffSpecialties.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setIsAssignDialogOpen(true)}
              disabled={getAvailableSpecialtiesForAssignment().length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Asignar Especialidad
            </Button>
          </div>

          {/* Lista de especialidades */}
          {staffSpecialties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-500">Sin especialidades</p>
                <p className="text-sm text-gray-400 mb-4">
                  Este miembro del staff no tiene especialidades asignadas
                </p>
                <Button 
                  onClick={() => setIsAssignDialogOpen(true)}
                  disabled={getAvailableSpecialtiesForAssignment().length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Asignar Primera Especialidad
                </Button>
              </CardContent>
            </Card>
          ) : (            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {staffSpecialties.map((specialty) => (
                <Card key={specialty.assignment_id || specialty.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: specialty.color }}
                          />                          <div>
                            <CardTitle className="text-base">{specialty.name}</CardTitle>
                            {specialty.is_primary ? (
                              <Badge variant="default" className="mt-1">
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-700">
                                <Shield className="h-3 w-3 mr-1" />
                                Básico
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge 
                          className={(proficiencyLevels[specialty.proficiency_level] || proficiencyLevels["intermediate"]).color}
                          variant="secondary"
                        >
                          {(proficiencyLevels[specialty.proficiency_level] || proficiencyLevels["intermediate"]).label}
                        </Badge>
                      </div>
                    </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">{specialty.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          <strong>Experiencia:</strong> {specialty.years_experience} año{specialty.years_experience !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {specialty.certification_info && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            <strong>Certificación:</strong> {specialty.certification_info}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          console.log('🔍 Specialty clicked for editing:', specialty);
                          if (!specialty.assignment_id) {
                            toast({
                              title: "Error",
                              description: "No se puede editar: falta ID de asignación",
                              variant: "destructive",
                            });
                            return;
                          }
                          setEditingAssignment({ ...specialty });
                          setIsEditDialogOpen(true);
                        }}
                        disabled={!specialty.assignment_id}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (!specialty.assignment_id) {
                            toast({
                              title: "Error",
                              description: "No se puede remover: falta ID de asignación",
                              variant: "destructive",
                            });
                            return;
                          }
                          handleRemoveSpecialty(specialty.assignment_id);
                        }}
                        disabled={!specialty.assignment_id}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remover                      </Button>
                    </div>
                  </CardContent>                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Dialog para asignar nueva especialidad */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Asignar Nueva Especialidad</DialogTitle>
              <DialogDescription>
                Selecciona una especialidad y configura el nivel de competencia
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Especialidad *</Label>
                <Select 
                  value={newAssignment.specialtyId} 
                  onValueChange={(value) => setNewAssignment({...newAssignment, specialtyId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSpecialtiesForAssignment().map(specialty => (
                      <SelectItem key={specialty.id} value={specialty.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: specialty.color }}
                          />
                          {specialty.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nivel de Competencia *</Label>
                <Select 
                  value={newAssignment.proficiencyLevel} 
                  onValueChange={(value: any) => setNewAssignment({...newAssignment, proficiencyLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(proficiencyLevels).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Años de Experiencia</Label>
                <Input
                  type="number"
                  min="0"
                  value={newAssignment.yearsExperience}
                  onChange={(e) => setNewAssignment({...newAssignment, yearsExperience: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Información de Certificación</Label>
                <Textarea
                  value={newAssignment.certificationInfo}
                  onChange={(e) => setNewAssignment({...newAssignment, certificationInfo: e.target.value})}
                  placeholder="Certificaciones, cursos, títulos relacionados (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="primary"
                  checked={newAssignment.isPrimary}
                  onCheckedChange={(checked) => setNewAssignment({...newAssignment, isPrimary: checked})}
                />
                <Label htmlFor="primary">Marcar como especialidad principal</Label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAssignDialogOpen(false);
                    setNewAssignment({
                      specialtyId: "",
                      proficiencyLevel: "intermediate",
                      yearsExperience: 0,
                      certificationInfo: "",
                      isPrimary: false
                    });
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAssignSpecialty} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Asignando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Asignar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar asignación */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Especialidad</DialogTitle>
              <DialogDescription>
                Actualiza el nivel de competencia y información de la especialidad
              </DialogDescription>
            </DialogHeader>
            {editingAssignment && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Especialidad</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: editingAssignment.color }}
                    />
                    <span className="font-medium">{editingAssignment.name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nivel de Competencia *</Label>
                  <Select 
                    value={editingAssignment.proficiency_level} 
                    onValueChange={(value: any) => setEditingAssignment(editingAssignment ? { ...editingAssignment, proficiency_level: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(proficiencyLevels).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Años de Experiencia</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingAssignment.years_experience}
                    onChange={(e) => setEditingAssignment(editingAssignment ? { ...editingAssignment, years_experience: parseInt(e.target.value) || 0 } : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Información de Certificación</Label>
                  <Textarea
                    value={editingAssignment.certification_info || ''}
                    onChange={(e) => setEditingAssignment(editingAssignment ? { ...editingAssignment, certification_info: e.target.value } : null)}
                    placeholder="Certificaciones, cursos, títulos relacionados (opcional)"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="primary-edit"
                    checked={editingAssignment.is_primary}
                    onCheckedChange={(checked) => setEditingAssignment(editingAssignment ? { ...editingAssignment, is_primary: checked } : null)}
                  />
                  <Label htmlFor="primary-edit">Marcar como especialidad principal</Label>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingAssignment(null);
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateAssignment} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Actualizar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default StaffSpecialtyManagement;
