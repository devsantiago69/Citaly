
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, Monitor, Moon, Settings } from 'lucide-react';

const ThemeSettings = () => {
  const { theme, setTheme, customColors, setCustomColors } = useTheme();
  
  const themes = [
    { id: 'classic', label: 'Clásico', icon: Monitor, description: 'Tema claro tradicional' },
    { id: 'dark', label: 'Oscuro', icon: Moon, description: 'Tema oscuro para mejor experiencia nocturna' },
    { id: 'custom', label: 'Personalizado', icon: Settings, description: 'Personaliza tus propios colores' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuración de Temas
          </CardTitle>
          <CardDescription>
            Personaliza la apariencia del sistema según tus preferencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as any)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themes.map((themeOption) => {
                const Icon = themeOption.icon;
                return (
                  <div key={themeOption.id} className="relative">
                    <RadioGroupItem
                      value={themeOption.id}
                      id={themeOption.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={themeOption.id}
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Icon className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">{themeOption.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {themeOption.description}
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {theme === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle>Colores Personalizados</CardTitle>
            <CardDescription>
              Ajusta los colores según tu marca o preferencias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary">Color Primario</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primary"
                    type="color"
                    value={customColors.primary}
                    onChange={(e) => setCustomColors({ primary: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={customColors.primary}
                    onChange={(e) => setCustomColors({ primary: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondary">Color Secundario</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="secondary"
                    type="color"
                    value={customColors.secondary}
                    onChange={(e) => setCustomColors({ secondary: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={customColors.secondary}
                    onChange={(e) => setCustomColors({ secondary: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="background">Color de Fondo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="background"
                    type="color"
                    value={customColors.background}
                    onChange={(e) => setCustomColors({ background: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={customColors.background}
                    onChange={(e) => setCustomColors({ background: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="text">Color de Texto</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="text"
                    type="color"
                    value={customColors.text}
                    onChange={(e) => setCustomColors({ text: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={customColors.text}
                    onChange={(e) => setCustomColors({ text: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThemeSettings;
