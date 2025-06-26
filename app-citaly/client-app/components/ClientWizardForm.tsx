import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ClientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alternative_phone: string;
  document_type: string;
  document_number: string;
  birth_date: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  emergency_contact: string;
  emergency_phone: string;
  medical_conditions: string;
  allergies: string;
  current_medications: string;
  communication_preferences: string[];
  preferred_language: string;
  privacy_consent: boolean;
  marketing_consent: boolean;
  notes: string;
}

const initialClientData: ClientFormData = {
  first_name: "",
  last_name: "",
  document_type: "DNI",
  document_number: "",
  birth_date: "",
  gender: "other",
  email: "",
  phone: "",
  alternative_phone: "",
  address: "",
  city: "",
  state: "",
  country: "Colombia",
  postal_code: "",
  emergency_contact: "",
  emergency_phone: "",
  medical_conditions: "",
  allergies: "",
  current_medications: "",
  communication_preferences: ["email"],
  preferred_language: "",
  privacy_consent: false,
  marketing_consent: false,
  notes: "",
};

interface Props {
  onSubmit: (data: ClientFormData) => Promise<void>;
  loading?: boolean;
  client?: Partial<ClientFormData>;
  onCancel?: () => void;
}

interface Country {
  code: string;
  name: string;
}

interface State {
  code: string;
  name: string;
}

export function ClientWizardForm({ onSubmit, loading = false, client, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>(() => ({
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    alternative_phone: client?.alternative_phone || '',
    document_type: client?.document_type || '',
    document_number: client?.document_number || '',
    birth_date: client?.birth_date || '',
    gender: client?.gender || '',
    address: client?.address || '',
    city: client?.city || '',
    state: client?.state || '',
    country: client?.country || '',
    postal_code: client?.postal_code || '',
    emergency_contact: client?.emergency_contact || '',
    emergency_phone: client?.emergency_phone || '',
    medical_conditions: client?.medical_conditions || '',
    allergies: client?.allergies || '',
    current_medications: client?.current_medications || '',
    communication_preferences: client?.communication_preferences || [],
    preferred_language: client?.preferred_language || '',
    privacy_consent: client?.privacy_consent || false,
    marketing_consent: client?.marketing_consent || false,
    notes: client?.notes || '',
  }));

  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingLocations(true);
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) throw new Error('Error fetching countries');
        const data = await response.json();
        setCountries(data);
        console.log('Countries loaded:', data); // Para debug
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) {
        setStates([]);
        return;
      }
      setLoadingLocations(true);
      try {
        const response = await fetch(`/api/states/${formData.country}`);
        if (!response.ok) throw new Error('Error fetching states');
        const data = await response.json();
        setStates(data);
        console.log('States loaded:', data); // Para debug
      } catch (error) {
        console.error('Error fetching states:', error);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchStates();
  }, [formData.country]);

  const updateField = (field: keyof ClientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (code: string) => {
    console.log('Country selected:', code); // Para debug
    setFormData(prev => ({
      ...prev,
      country: code,
      state: '', // Resetear estado cuando cambia el país
    }));
  };

  const handleInputChange = (field: keyof ClientFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Información personal
        return !!(formData.first_name && formData.last_name && formData.document_number);
      case 2: // Información de contacto
        return !!(formData.email && formData.phone);
      case 3: // Contacto de emergencia
        return !!(formData.emergency_contact && formData.emergency_phone);
      case 4: // Información médica
        return true; // Opcional
      case 5: // Preferencias
        return true; // Las preferencias son opcionales
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  const handleSubmit = async () => {
    try {
      // Asegurarse de que todos los datos requeridos estén presentes
      if (
        !formData.first_name ||
        !formData.last_name ||
        !formData.document_number ||
        !formData.email ||
        !formData.phone
      ) {
        console.error('Faltan campos requeridos');
        return;
      }

      // Llamar a la función onSubmit con los datos actualizados
      await onSubmit(formData);
    } catch (error) {
      console.error('Error al guardar los datos:', error);
    }
  };

  const personalInfoStep = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Nombre</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            placeholder="Nombre"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Apellidos</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            placeholder="Apellidos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document_type">Tipo de Documento</Label>
          <Select
            value={formData.document_type}
            onValueChange={(value) => handleInputChange('document_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dni">DNI</SelectItem>
              <SelectItem value="passport">Pasaporte</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document_number">Número de Documento</Label>
          <Input
            id="document_number"
            value={formData.document_number}
            onChange={(e) => handleInputChange('document_number', e.target.value)}
            placeholder="Número de documento"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleInputChange('birth_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Género</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => handleInputChange('gender', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Masculino</SelectItem>
              <SelectItem value="female">Femenino</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="email@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Teléfono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alternative_phone">Teléfono Alternativo</Label>
          <Input
            id="alternative_phone"
            value={formData.alternative_phone}
            onChange={(e) => handleInputChange('alternative_phone', e.target.value)}
            placeholder="Teléfono alternativo"
          />
        </div>
      </div>
    </div>
  );

  const addressStep = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Calle y número"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Select
            value={formData.country}
            onValueChange={handleCountryChange}
            disabled={loadingLocations}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingLocations ? "Cargando países..." : "Seleccione un país"} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado/Región</Label>
          <Select
            value={formData.state}
            onValueChange={(value) => handleInputChange('state', value)}
            disabled={!formData.country || loadingLocations}
          >
            <SelectTrigger className="w-full">
              <SelectValue 
                placeholder={
                  !formData.country 
                    ? "Primero seleccione un país" 
                    : loadingLocations 
                      ? "Cargando estados..." 
                      : "Seleccione un estado"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!formData.country && (
            <p className="text-sm text-muted-foreground mt-1">
              Seleccione un país para ver los estados disponibles
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Ciudad"
          />
        </div>
      </div>
    </div>
  );

  const emergencyContactStep = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="emergency_contact">Contacto de Emergencia</Label>
          <Input
            id="emergency_contact"
            value={formData.emergency_contact}
            onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
            placeholder="Nombre del contacto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergency_phone">Teléfono de Emergencia</Label>
          <Input
            id="emergency_phone"
            value={formData.emergency_phone}
            onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
            placeholder="Teléfono de emergencia"
          />
        </div>
      </div>
    </div>
  );

  const medicalInfoStep = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="medical_conditions">Condiciones Médicas</Label>
          <Textarea
            id="medical_conditions"
            value={formData.medical_conditions}
            onChange={(e) => handleInputChange('medical_conditions', e.target.value)}
            placeholder="Describa cualquier condición médica relevante"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="allergies">Alergias</Label>
          <Textarea
            id="allergies"
            value={formData.allergies}
            onChange={(e) => handleInputChange('allergies', e.target.value)}
            placeholder="Liste cualquier alergia conocida"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_medications">Medicamentos Actuales</Label>
          <Textarea
            id="current_medications"
            value={formData.current_medications}
            onChange={(e) => handleInputChange('current_medications', e.target.value)}
            placeholder="Liste los medicamentos que toma actualmente"
          />
        </div>        <div className="space-y-2">
          <Label htmlFor="notes">Notas Adicionales</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Cualquier otra información relevante"
          />
        </div>
      </div>
    </div>
  );
  

  const formSteps = [
    { title: "Información Personal", component: personalInfoStep },
    { title: "Dirección", component: addressStep },
    { title: "Contacto de Emergencia", component: emergencyContactStep },
    { title: "Información Médica", component: medicalInfoStep },
  ];

  const isLastStep = currentStep === formSteps.length;

  const next = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const prev = () => {
    setCurrentStep(s => s - 1);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{formSteps[currentStep - 1].title}</h3>
        <div className="h-1 w-full bg-gray-200 rounded">
          <div
            className="h-1 bg-primary rounded transition-all"
            style={{ width: `${(currentStep / formSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {formSteps[currentStep - 1].component}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : prev}
          disabled={loading}
        >
          {currentStep === 1 ? "Cancelar" : "Anterior"}
        </Button>
        <Button onClick={next} disabled={loading}>
          {isLastStep ? (loading ? "Guardando..." : "Guardar") : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}
