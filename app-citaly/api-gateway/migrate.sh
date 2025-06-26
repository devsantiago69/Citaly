#!/bin/bash

# Script de migración para cambiar del servidor monolítico a la estructura modular
# Ejecutar desde: api-gateway/

echo "?? Iniciando migración a estructura modular..."

# 1. Backup del archivo original
echo "?? Creando backup del server.js original..."
if [ -f "server.js" ]; then
    cp server.js server-backup.js
    echo "? Backup creado: server-backup.js"
else
    echo "??  No se encontró server.js original"
fi

# 2. Reemplazar el servidor principal
echo "?? Reemplazando servidor principal..."
if [ -f "server-new.js" ]; then
    mv server.js server-legacy.js 2>/dev/null || true
    mv server-new.js server.js
    echo "? Servidor migrado a estructura modular"
else
    echo "? No se encontró server-new.js"
    exit 1
fi

# 3. Verificar estructura de directorios
echo "?? Verificando estructura de directorios..."
directories=("config" "routes" "controllers" "models" "middlewares" "services" "utils")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "? $dir/"
    else
        echo "? $dir/ - FALTA"
    fi
done

# 4. Verificar archivos críticos
echo "?? Verificando archivos críticos..."
critical_files=(
    "config/db.js"
    "config/env.js"
    "routes/citas.routes.js"
    "routes/usuarios.routes.js"
    "controllers/citas.controller.js"
    "controllers/usuarios.controller.js"
    "middlewares/auth.js"
    ".env"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo "? $file"
    else
        echo "? $file - FALTA"
    fi
done

# 5. Actualizar package.json si es necesario
echo "?? Verificando package.json..."
if grep -q "server-new.js" package.json; then
    echo "? package.json contiene referencias a la nueva estructura"
else
    echo "??  package.json puede necesitar actualización"
fi

# 6. Verificar dependencias
echo "?? Verificando dependencias..."
if [ -f "package.json" ]; then
    if command -v npm &> /dev/null; then
        echo "?? Instalando dependencias..."
        npm install
        echo "? Dependencias instaladas"
    else
        echo "??  npm no encontrado. Instalar dependencias manualmente."
    fi
else
    echo "? package.json no encontrado"
fi

# 7. Verificar variables de entorno
echo "?? Verificando configuración..."
if [ -f ".env" ]; then
    if grep -q "DB_NAME" .env; then
        echo "? .env actualizado con nuevas variables"
    else
        echo "??  .env puede necesitar actualización con nuevas variables"
    fi
else
    echo "? .env no encontrado"
fi

echo ""
echo "?? ¡Migración completada!"
echo ""
echo "?? Próximos pasos:"
echo "   1. Revisar las configuraciones en .env"
echo "   2. Probar el servidor: npm run dev"
echo "   3. Verificar endpoints en: http://localhost:3001"
echo "   4. Revisar logs para errores"
echo ""
echo "?? Documentación disponible en: README-ESTRUCTURA.md"
echo ""
echo "?? Para revertir la migración:"
echo "   mv server.js server-modular.js"
echo "   mv server-legacy.js server.js"
echo ""
