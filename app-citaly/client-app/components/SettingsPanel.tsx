import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette, Bell, CreditCard, Shield } from "lucide-react";

const SettingsPanel = () => {
  const [settings, setSettings] = useState({
    primaryColor: "#3b82f6",
    enableSms: true,
    enableEmail: true,
    paymentGateway: "stripe",
    twoFactorAuth: false
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza los colores y el logo de tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="primaryColor">Color principal</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="w-16 h-10"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                  />
                  <span className="text-sm text-gray-600">{settings.primaryColor}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="logo">Logo del negocio</Label>
                <Button variant="outline" className="w-full mt-2">
                  Subir logo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo se envían las notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enableSms">Habilitar notificaciones por SMS</Label>
              <Switch
                id="enableSms"
                checked={settings.enableSms}
                onCheckedChange={(checked) => setSettings({...settings, enableSms: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableEmail">Habilitar notificaciones por Email</Label>
              <Switch
                id="enableEmail"
                checked={settings.enableEmail}
                onCheckedChange={(checked) => setSettings({...settings, enableEmail: checked})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Configuración de Pagos
            </CardTitle>
            <CardDescription>
              Define tu pasarela de pagos preferida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Pasarela de Pagos</Label>
            <select
              value={settings.paymentGateway}
              onChange={(e) => setSettings({...settings, paymentGateway: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md mt-2"
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="mercado_pago">Mercado Pago</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Ajustes de seguridad de la cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="twoFactorAuth">Autenticación de dos factores (2FA)</Label>
              <Switch
                id="twoFactorAuth"
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">Guardar Cambios</Button>
      </div>
    </div>
  );
};

export default SettingsPanel;
