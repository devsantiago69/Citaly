import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Key, 
  Download, 
  Calendar, 
  AlertTriangle,
  Crown,
  Building,
  ArrowRightLeft,
  TrendingUp,
  Users,
  UserCheck,
  CalendarDays,
  BarChart3,
  AlertCircle,
  ArrowUp,
  Shield
} from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  max_users: number;
  max_clients: number;
  max_appointments: number;
  max_services: number;
  has_advanced_reports: boolean;
  has_api_access: boolean;
  has_priority_support: boolean;
  is_active: boolean;
  features: string;
}

interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  is_trial: boolean;
  remaining_days: number;
}

interface Invoice {
  id: number;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string;
  description: string;
  invoice_number: string;
}

interface PaymentNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: string;
  created_at: string;
}

interface PlanUsage {
  planName: string;
  planFeatures: {
    max_appointments: number;
    max_clients: number;
    max_staff: number;
    storage_gb: number;
  };
  currentUsage: {
    appointments: number;
    clients: number;
    staff: number;
    storage_used: number;
  };
  usagePercentages: {
    appointments: number;
    clients: number;
    staff: number;
    storage: number;
  };
  alerts: Array<{
    type: string;
    resource: string;
    message: string;
    severity: string;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    suggestedPlan?: string;
    benefits?: string[];
    suggestions?: string[];
  }>;
}

// Función para formatear precios en pesos colombianos
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Función para obtener el color y el ícono según el tipo de plan
const getPlanDetails = (planName: string) => {
  const name = planName.toLowerCase();
  
  if (name.includes('básico') || name.includes('basic')) {
    return {
      icon: Building,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      gradient: 'from-gray-50 to-gray-100'
    };
  }
  
  if (name.includes('profesional') || name.includes('pro')) {
    return {
      icon: Crown,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      gradient: 'from-blue-50 to-blue-100'
    };
  }
  
  if (name.includes('premium') || name.includes('enterprise')) {
    return {
      icon: Zap,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      gradient: 'from-purple-50 to-purple-100'
    };
  }
  
  return {
    icon: Building,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    gradient: 'from-gray-50 to-gray-100'
  };
};

const BillingPanel: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activationCode, setActivationCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showPlanChangeDialog, setShowPlanChangeDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load subscription data
      const subResponse = await fetch('/api/billing/subscription');
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }

      // Load available plans
      const plansResponse = await fetch('/api/billing/plans');
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData);
      }

      // Load invoices
      const invoicesResponse = await fetch('/api/billing/invoices');
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData);
      }

      // Load payment notifications
      const notificationsResponse = await fetch('/api/billing/payment-notifications');
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData);
      }

      // Load plan usage
      const usageResponse = await fetch('/api/billing/plan-usage');
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setPlanUsage(usageData);
      }

    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos de facturación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };const activatePlan = async () => {
    if (!activationCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de activación",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/billing/activate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activationCode.trim() })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Éxito",
          description: result.message || 'Plan activado exitosamente',
        });
        setActivationCode('');
        setShowActivationDialog(false);
        // Reload data to reflect changes
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Error al activar el plan',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Network error activating plan:', error);
      toast({
        title: "Error de conexión",
        description: "Error de conexión al activar el plan",
        variant: "destructive",
      });
    }
  };  const changePlan = async () => {
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Por favor selecciona un plan",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          new_plan_id: selectedPlan,
          activation_code: activationCode.trim() || null
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Éxito",
          description: result.message || 'Plan cambiado exitosamente',
        });
        setSelectedPlan(null);
        setActivationCode('');
        setShowPlanChangeDialog(false);
        // Reload data to reflect changes
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Error al cambiar el plan',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Network error changing plan:', error);
      toast({
        title: "Error de conexión",
        description: "Error de conexión al cambiar el plan",
        variant: "destructive",
      });
    }
  };
  const suspendSubscription = async () => {
    try {
      const response = await fetch('/api/billing/suspend-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Suscripción suspendida",
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: "Error al suspender la suscripción",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  const reactivateSubscription = async () => {
    try {
      const response = await fetch('/api/billing/reactivate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Suscripción reactivada",
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: "Error al reactivar la suscripción",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };
  const downloadInvoice = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/billing/download-invoice/${invoiceId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Éxito",
          description: "Factura descargada exitosamente",
        });
      } else {
        toast({
          title: "Error",
          description: "Error al descargar la factura",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al descargar la factura",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'suspended': { color: 'bg-red-100 text-red-800', icon: XCircle },
      'expired': { color: 'bg-gray-100 text-gray-800', icon: Clock },
      'trial': { color: 'bg-blue-100 text-blue-800', icon: Zap },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };  const getPlanIcon = (planName: string) => {
    return getPlanDetails(planName).icon;
  };

  const getUsageAlert = (percentage: number, type: string) => {
    if (percentage >= 90) {
      return {
        level: 'critical',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
        message: `Has usado el ${percentage.toFixed(0)}% de tus ${type}. ¡Considera actualizar tu plan!`
      };
    } else if (percentage >= 80) {
      return {
        level: 'warning',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle,
        message: `Has usado el ${percentage.toFixed(0)}% de tus ${type}. Te recomendamos monitorear tu uso.`
      };
    } else if (percentage >= 60) {
      return {
        level: 'info',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: BarChart3,
        message: `Has usado el ${percentage.toFixed(0)}% de tus ${type}. Buen ritmo de uso.`
      };
    }
    return null;
  };
  const getRecommendation = () => {
    if (!planUsage || !subscription) return null;

    const { appointments, clients, staff } = planUsage.usagePercentages;
    const maxUsage = Math.max(appointments, clients, staff);
    
    if (maxUsage >= 90) {
      const nextPlan = plans.find(p => p.id > subscription.plan_id);
      return {
        type: 'urgent',
        title: 'Actualización Urgente Recomendada',
        message: `Tu uso está al ${maxUsage.toFixed(0)}%. ${nextPlan ? `Te recomendamos actualizar al ${nextPlan.name}` : 'Considera un plan personalizado'}.`,
        action: nextPlan ? 'Actualizar Plan' : 'Contactar Soporte'
      };
    } else if (maxUsage >= 80) {
      return {
        type: 'suggestion',
        title: 'Considera Actualizar',
        message: `Con un uso del ${maxUsage.toFixed(0)}%, podrías beneficiarte de un plan superior para mayor tranquilidad.`,
        action: 'Ver Planes'
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}      {/* Payment Notifications */}
      {notifications.filter(n => !n.is_read && n.priority === 'high').length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Tienes {notifications.filter(n => !n.is_read && n.priority === 'high').length} notificaciones importantes de pago pendientes.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Subscription */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Suscripción Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{subscription.plan_name}</h3>
                    <p className="text-sm text-gray-600">
                      {subscription.is_trial ? 'Período de prueba' : 'Suscripción activa'}
                    </p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Fecha de inicio:</span>
                    <p className="font-medium">{new Date(subscription.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha de vencimiento:</span>
                    <p className="font-medium">{new Date(subscription.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Días restantes:</span>
                    <p className={`font-medium ${subscription.remaining_days <= 7 ? 'text-red-600' : 'text-green-600'}`}>
                      {subscription.remaining_days} días
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Renovación automática:</span>
                    <p className="font-medium">{subscription.auto_renew ? 'Sí' : 'No'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Dialog open={showPlanChangeDialog} onOpenChange={setShowPlanChangeDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cambiar Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Cambiar de Plan</DialogTitle>
                        <DialogDescription>
                          Elige un nuevo plan que se ajuste mejor a tus necesidades. Tu ciclo de facturación se actualizará inmediatamente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-4">
                          <Label className="text-base font-semibold">Planes Disponibles</Label>
                          <RadioGroup
                            value={selectedPlan ? String(selectedPlan) : ''}
                            onValueChange={(value) => setSelectedPlan(Number(value))}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            {plans.filter(p => p.id !== subscription.plan_id).map(plan => (
                              <Label 
                                key={plan.id}
                                htmlFor={`plan-${plan.id}`}
                                className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${selectedPlan === plan.id ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-blue-900">{plan.name}</h4>
                                  <RadioGroupItem value={String(plan.id)} id={`plan-${plan.id}`} />
                                </div>                                <p className="text-xl font-bold mt-2 text-gray-800">
                                  {formatPrice(plan.price)} <span className="text-sm font-normal text-gray-500">/{plan.billing_cycle}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                              </Label>
                            ))}
                          </RadioGroup>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="activation-code" className="font-semibold">Código de Activación (Opcional)</Label>
                          <Input
                            id="activation-code"
                            value={activationCode}
                            onChange={(e) => setActivationCode(e.target.value)}
                            placeholder="Ingresa un código si tienes uno"
                          />
                        </div>
                      </div>
                      <DialogFooter className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setShowPlanChangeDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={changePlan} disabled={!selectedPlan}>
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Confirmar Cambio
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {subscription.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={suspendSubscription}>
                      Suspender
                    </Button>
                  )}

                  {subscription.status === 'suspended' && (
                    <Button variant="outline" size="sm" onClick={reactivateSubscription}>
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No tienes una suscripción activa</p>
                <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Key className="w-4 h-4 mr-2" />
                      Activar Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Activar Plan con Código</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Código de activación:</label>
                        <Input
                          value={activationCode}
                          onChange={(e) => setActivationCode(e.target.value)}
                          placeholder="Ingresa tu código de activación"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowActivationDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={activatePlan}>
                          Activar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Key className="w-4 h-4 mr-2" />
                  Activar con Código
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Button className="w-full" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Descargar Facturas
            </Button>
            
            <Button className="w-full" variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Historial de Pagos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="usage" className="space-y-4">        <TabsList>
          <TabsTrigger value="usage">Consumo</TabsTrigger>
          <TabsTrigger value="plans">Planes Disponibles</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <div className="space-y-6">
            {/* Plan Overview */}
            {planUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Uso de Plan - {planUsage.planName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Appointments Usage */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Citas (mes actual)</span>
                        </div>
                        <Badge variant={planUsage.usagePercentages.appointments >= 90 ? 'destructive' : planUsage.usagePercentages.appointments >= 80 ? 'secondary' : 'default'}>
                          {planUsage.usagePercentages.appointments}%
                        </Badge>
                      </div>
                      <Progress value={planUsage.usagePercentages.appointments} className="h-2" />                      <div className="text-xs text-gray-600">
                        {planUsage.currentUsage.appointments.toLocaleString()} de {planUsage.planFeatures.max_appointments === -1 ? 'ilimitadas' : planUsage.planFeatures.max_appointments.toLocaleString()} utilizadas
                      </div>
                    </div>

                    {/* Clients Usage */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Clientes</span>
                        </div>
                        <Badge variant={planUsage.usagePercentages.clients >= 90 ? 'destructive' : planUsage.usagePercentages.clients >= 80 ? 'secondary' : 'default'}>
                          {planUsage.usagePercentages.clients}%
                        </Badge>
                      </div>
                      <Progress value={planUsage.usagePercentages.clients} className="h-2" />                      <div className="text-xs text-gray-600">
                        {planUsage.currentUsage.clients.toLocaleString()} de {planUsage.planFeatures.max_clients === -1 ? 'ilimitados' : planUsage.planFeatures.max_clients.toLocaleString()} registrados
                      </div>
                    </div>

                    {/* Staff Usage */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">Personal</span>
                        </div>
                        <Badge variant={planUsage.usagePercentages.staff >= 90 ? 'destructive' : planUsage.usagePercentages.staff >= 80 ? 'secondary' : 'default'}>
                          {planUsage.usagePercentages.staff}%
                        </Badge>
                      </div>
                      <Progress value={planUsage.usagePercentages.staff} className="h-2" />                      <div className="text-xs text-gray-600">
                        {planUsage.currentUsage.staff.toLocaleString()} de {planUsage.planFeatures.max_staff === -1 ? 'ilimitados' : planUsage.planFeatures.max_staff.toLocaleString()} miembros
                      </div>
                    </div>

                    {/* Storage Usage */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">Almacenamiento</span>
                        </div>
                        <Badge variant={planUsage.usagePercentages.storage >= 90 ? 'destructive' : planUsage.usagePercentages.storage >= 80 ? 'secondary' : 'default'}>
                          {planUsage.usagePercentages.storage}%
                        </Badge>
                      </div>
                      <Progress value={planUsage.usagePercentages.storage} className="h-2" />
                      <div className="text-xs text-gray-600">
                        {planUsage.currentUsage.storage_used.toFixed(1)} GB de {planUsage.planFeatures.storage_gb} GB
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerts Section */}
            {planUsage && planUsage.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Alertas de Uso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {planUsage.alerts.map((alert, index) => (
                      <Alert key={index} className={`${
                        alert.severity === 'high' ? 'border-red-200 bg-red-50' : 
                        alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' : 
                        'border-blue-200 bg-blue-50'
                      }`}>
                        <AlertCircle className={`h-4 w-4 ${
                          alert.severity === 'high' ? 'text-red-600' : 
                          alert.severity === 'medium' ? 'text-yellow-600' : 
                          'text-blue-600'
                        }`} />
                        <AlertDescription className={`${
                          alert.severity === 'high' ? 'text-red-800' : 
                          alert.severity === 'medium' ? 'text-yellow-800' : 
                          'text-blue-800'
                        }`}>
                          {alert.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations Section */}
            {planUsage && planUsage.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Recomendaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {planUsage.recommendations.map((recommendation, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        recommendation.type === 'upgrade' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {recommendation.type === 'upgrade' ? (
                                <ArrowUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <BarChart3 className="h-4 w-4 text-blue-600" />
                              )}
                              <span className={`font-medium ${
                                recommendation.type === 'upgrade' ? 'text-green-800' : 'text-blue-800'
                              }`}>
                                {recommendation.type === 'upgrade' ? 'Actualización Recomendada' : 'Optimización'}
                              </span>
                            </div>
                            <p className={`text-sm mb-3 ${
                              recommendation.type === 'upgrade' ? 'text-green-700' : 'text-blue-700'
                            }`}>
                              {recommendation.message}
                            </p>
                            {recommendation.benefits && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-600 mb-2">
                                  Beneficios del {recommendation.suggestedPlan}:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                  {recommendation.benefits.map((benefit, benefitIndex) => (
                                    <div key={benefitIndex} className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span className="text-xs text-gray-700">{benefit}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {recommendation.suggestions && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-600 mb-2">Sugerencias:</p>
                                <div className="space-y-1">
                                  {recommendation.suggestions.map((suggestion, sugIndex) => (
                                    <div key={sugIndex} className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-blue-600" />
                                      <span className="text-xs text-gray-700">{suggestion}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {recommendation.type === 'upgrade' && recommendation.suggestedPlan && (
                            <Button 
                              size="sm" 
                              onClick={() => {
                                const plan = plans.find(p => p.name === recommendation.suggestedPlan);
                                if (plan) {
                                  setSelectedPlan(plan.id);
                                  setShowPlanChangeDialog(true);
                                }
                              }}
                              className="ml-4"
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Actualizar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Usage Summary Card */}
            {planUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumen de Uso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Uso Actual</h4>
                      <div className="space-y-2 text-sm">                        <div className="flex justify-between">
                          <span>Citas este mes:</span>
                          <span className="font-medium">{planUsage.currentUsage.appointments.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clientes registrados:</span>
                          <span className="font-medium">{planUsage.currentUsage.clients.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Miembros del staff:</span>
                          <span className="font-medium">{planUsage.currentUsage.staff.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Almacenamiento:</span>
                          <span className="font-medium">{planUsage.currentUsage.storage_used.toFixed(1)} GB</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Límites del Plan</h4>
                      <div className="space-y-2 text-sm">                        <div className="flex justify-between">
                          <span>Citas máximas/mes:</span>
                          <span className="font-medium">
                            {planUsage.planFeatures.max_appointments === -1 ? 'Ilimitadas' : planUsage.planFeatures.max_appointments.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clientes máximos:</span>
                          <span className="font-medium">
                            {planUsage.planFeatures.max_clients === -1 ? 'Ilimitadas' : planUsage.planFeatures.max_clients.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Staff máximo:</span>
                          <span className="font-medium">
                            {planUsage.planFeatures.max_staff === -1 ? 'Ilimitado' : planUsage.planFeatures.max_staff.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Almacenamiento:</span>
                          <span className="font-medium">{planUsage.planFeatures.storage_gb} GB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Usage Data Message */}
            {!planUsage && (
              <Card>
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">No hay datos de uso disponibles</p>
                  <p className="text-sm text-gray-500">Los datos de uso se mostrarán una vez que tengas una suscripción activa</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Elige el plan perfecto para tu negocio</h2>
              <p className="text-gray-600">Todos los planes incluyen soporte técnico y actualizaciones gratuitas</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">              {plans.map((plan) => {
                const planDetails = getPlanDetails(plan.name);
                const PlanIcon = planDetails.icon;
                
                // Manejo seguro del parsing de features
                let features: string[] = [];
                try {
                  if (plan.features && typeof plan.features === 'string' && plan.features.trim() !== '') {
                    const parsed = JSON.parse(plan.features);
                    if (Array.isArray(parsed)) {
                      features = parsed.filter(f => f && typeof f === 'string' && f.trim() !== '');
                    }
                  }
                } catch (e) {
                  console.warn('Error parsing plan features:', e);
                  features = [];
                }
                
                const isCurrentPlan = subscription?.plan_id === plan.id;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                      isCurrentPlan 
                        ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
                        : 'hover:scale-105'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${planDetails.gradient} opacity-5`} />
                    
                    {isCurrentPlan && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                          Plan Actual
                        </div>
                      </div>
                    )}

                    <CardHeader className="relative">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${planDetails.color}`}>
                          <PlanIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                        </div>
                      </div>
                      
                      <div className="text-center py-4">
                        <div className="text-3xl font-bold text-gray-900">
                          {formatPrice(plan.price)}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          por {plan.billing_cycle}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative space-y-4">
                      {/* Límites del plan */}
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Usuarios</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {plan.max_users === -1 ? 'Ilimitados' : plan.max_users}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Clientes</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {plan.max_clients === -1 ? 'Ilimitados' : plan.max_clients.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">Citas/mes</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {plan.max_appointments === -1 ? 'Ilimitadas' : plan.max_appointments.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Características del plan */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900 text-sm">Características incluidas:</h4>
                        <div className="space-y-2">
                          {plan.has_advanced_reports && (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="text-sm text-gray-700">Reportes avanzados</span>
                            </div>
                          )}
                          
                          {plan.has_api_access && (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="text-sm text-gray-700">Acceso a API</span>
                            </div>
                          )}
                          
                          {plan.has_priority_support && (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="text-sm text-gray-700">Soporte prioritario</span>
                            </div>
                          )}
                            {features.length > 0 && features.map((feature: string, index: number) => {
                            // Validación adicional para asegurar que el feature es válido
                            if (!feature || typeof feature !== 'string' || feature.trim() === '' || /^\d+$/.test(feature.trim())) {
                              return null;
                            }
                            
                            return (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-sm text-gray-700">{feature.trim()}</span>
                              </div>
                            );
                          })}

                          {/* Mensaje cuando no hay características adicionales */}
                          {!plan.has_advanced_reports && !plan.has_api_access && !plan.has_priority_support && features.length === 0 && (
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-gray-400" />
                              </div>
                              <span className="text-sm">Características básicas incluidas</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botón de acción */}
                      <div className="pt-4">
                        {isCurrentPlan ? (
                          <div className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <span className="text-sm font-medium text-blue-700">Tu plan actual</span>
                          </div>
                        ) : (
                          <Button 
                            className={`w-full ${
                              planDetails.color.includes('purple') 
                                ? 'bg-purple-600 hover:bg-purple-700' 
                                : planDetails.color.includes('blue')
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-600 hover:bg-gray-700'
                            }`}
                            onClick={() => {
                              setSelectedPlan(plan.id);
                              setShowPlanChangeDialog(true);
                            }}
                          >
                            {subscription?.plan_id ? 'Cambiar a este plan' : 'Seleccionar plan'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Información adicional */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-gray-900">Garantía de satisfacción</span>
              </div>
              <p className="text-sm text-gray-600">
                Todos nuestros planes incluyen una garantía de 30 días. Si no estás satisfecho, te devolvemos tu dinero.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Facturas</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invoice.invoice_number}</span>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <p className="text-sm text-gray-600">{invoice.description}</p>
                        <p className="text-sm text-gray-500">
                          Vencimiento: {new Date(invoice.due_date).toLocaleDateString()}
                          {invoice.paid_date && ` | Pagado: ${new Date(invoice.paid_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(invoice.amount)}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadInvoice(invoice.id)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">No hay facturas disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-3 border rounded-lg ${notification.is_read ? 'bg-gray-50' : 'bg-white border-blue-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{notification.title}</h4>
                            <Badge className={notification.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                              {notification.priority}
                            </Badge>
                            {!notification.is_read && (
                              <Badge className="bg-green-100 text-green-800">Nuevo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">No hay notificaciones</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>  );
};

export default BillingPanel;