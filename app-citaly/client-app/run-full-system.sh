#!/bin/bash

# Script para ejecutar ambos servidores (backend y frontend) y realizar pruebas completas
# Este script facilita la prueba de la nueva arquitectura modular

echo "?? EJECUTANDO SERVIDOR COMPLETO - BACKEND MODULAR + FRONTEND"
echo "============================================================"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para limpiar procesos al salir
cleanup() {
    echo -e "\n${YELLOW}?? Deteniendo servidores...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}? Backend detenido${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}? Frontend detenido${NC}"
    fi
    exit 0
}

# Capturar Ctrl+C para limpiar
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}?? VERIFICANDO PRERREQUISITOS${NC}"
echo "==============================="

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}? Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}? Node.js $(node --version)${NC}"

# Verificar que npm esté instalado
if ! command -v npm &> /dev/null; then
    echo -e "${RED}? npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}? npm $(npm --version)${NC}"

# Verificar estructura de directorios
if [ ! -d "../api-gateway" ]; then
    echo -e "${RED}? Directorio api-gateway no encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}? Directorio api-gateway encontrado${NC}"

if [ ! -f "../api-gateway/server-new.js" ]; then
    echo -e "${RED}? Archivo server-new.js no encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}? Servidor modular (server-new.js) encontrado${NC}"

if [ ! -d "src" ]; then
    echo -e "${RED}? Directorio src del frontend no encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}? Directorio frontend encontrado${NC}"

echo ""
echo -e "${BLUE}?? INSTALANDO DEPENDENCIAS${NC}"
echo "============================"

# Instalar dependencias del backend si es necesario
echo -e "${CYAN}?? Verificando dependencias del backend...${NC}"
cd ../api-gateway
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}??  Instalando dependencias del backend...${NC}"
    npm install
fi
echo -e "${GREEN}? Dependencias del backend listas${NC}"

# Volver al frontend
cd ../client-app

# Instalar dependencias del frontend si es necesario
echo -e "${CYAN}?? Verificando dependencias del frontend...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}??  Instalando dependencias del frontend...${NC}"
    npm install
fi
echo -e "${GREEN}? Dependencias del frontend listas${NC}"

echo ""
echo -e "${BLUE}?? INICIANDO SERVIDORES${NC}"
echo "======================="

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        return 0
    else
        return 1
    fi
}

# Verificar puertos
if check_port 3001; then
    echo -e "${RED}? Puerto 3001 (backend) ya está en uso${NC}"
    echo -e "${YELLOW}?? Detén el proceso que usa el puerto 3001 y vuelve a intentar${NC}"
    exit 1
fi

if check_port 5173; then
    echo -e "${RED}? Puerto 5173 (frontend) ya está en uso${NC}"
    echo -e "${YELLOW}?? Detén el proceso que usa el puerto 5173 y vuelve a intentar${NC}"
    exit 1
fi

# Iniciar backend modular
echo -e "${CYAN}?? Iniciando backend modular (puerto 3001)...${NC}"
cd ../api-gateway
node server-new.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

# Esperar a que el backend esté listo
echo -e "${YELLOW}? Esperando que el backend esté listo...${NC}"
sleep 3

# Verificar que el backend esté corriendo
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}? Error al iniciar el backend${NC}"
    echo -e "${YELLOW}?? Verificar logs: cat ../logs/backend.log${NC}"
    exit 1
fi

# Verificar que el backend responda
if curl -s http://localhost:3001/health >/dev/null; then
    echo -e "${GREEN}? Backend modular corriendo en http://localhost:3001${NC}"
else
    echo -e "${RED}? Backend no responde en el puerto 3001${NC}"
    cleanup
    exit 1
fi

# Volver al frontend
cd ../client-app

# Iniciar frontend
echo -e "${CYAN}?? Iniciando frontend (puerto 5173)...${NC}"
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Esperar a que el frontend esté listo
echo -e "${YELLOW}? Esperando que el frontend esté listo...${NC}"
sleep 5

# Verificar que el frontend esté corriendo
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}? Error al iniciar el frontend${NC}"
    echo -e "${YELLOW}?? Verificar logs: cat ../logs/frontend.log${NC}"
    cleanup
    exit 1
fi

echo -e "${GREEN}? Frontend corriendo en http://localhost:5173${NC}"

echo ""
echo -e "${BLUE}?? EJECUTANDO PRUEBAS DE API${NC}"
echo "============================"

# Ejecutar pruebas de endpoints
if [ -f "test-api-endpoints.js" ]; then
    echo -e "${CYAN}?? Probando endpoints del API modular...${NC}"
    node test-api-endpoints.js
else
    echo -e "${YELLOW}??  Archivo de pruebas no encontrado${NC}"
fi

echo ""
echo -e "${GREEN}?? SISTEMA COMPLETO INICIADO${NC}"
echo "==========================="
echo -e "${GREEN}? Backend modular: http://localhost:3001${NC}"
echo -e "${GREEN}? Frontend: http://localhost:5173${NC}"
echo ""
echo -e "${CYAN}?? ENDPOINTS DISPONIBLES:${NC}"
echo "• GET  http://localhost:3001/ (Health check)"
echo "• GET  http://localhost:3001/health (Detailed health)"
echo "• GET  http://localhost:3001/api/appointments (Citas)"
echo "• GET  http://localhost:3001/api/clients (Clientes)"
echo "• GET  http://localhost:3001/api/services (Servicios)"
echo "• GET  http://localhost:3001/api/reports/overview (Dashboard)"
echo "• GET  http://localhost:3001/api/search?q=test (Búsqueda)"
echo ""
echo -e "${YELLOW}?? FUNCIONALIDADES NUEVAS:${NC}"
echo "• ?? Reportes avanzados"
echo "• ?? Búsqueda global"
echo "• ?? Gestión de especialidades del personal"
echo "• ?? Dashboard ejecutivo"
echo "• ?? Datos geográficos"
echo ""
echo -e "${BLUE}?? COMANDOS ÚTILES:${NC}"
echo "• Logs backend: tail -f ../logs/backend.log"
echo "• Logs frontend: tail -f ../logs/frontend.log"
echo "• Probar API: curl http://localhost:3001/health"
echo "• Abrir app: xdg-open http://localhost:5173 (Linux) / open http://localhost:5173 (Mac)"
echo ""
echo -e "${GREEN}? Presiona Ctrl+C para detener ambos servidores${NC}"
echo ""

# Mostrar logs en tiempo real (opcional)
echo -e "${CYAN}?? Logs en tiempo real (últimas 10 líneas):${NC}"
echo "============================================"

# Crear directorio de logs si no existe
mkdir -p ../logs

# Función para mostrar logs
show_logs() {
    echo -e "\n${CYAN}?? Backend Log:${NC}"
    tail -n 5 ../logs/backend.log 2>/dev/null || echo "No hay logs del backend aún"

    echo -e "\n${CYAN}?? Frontend Log:${NC}"
    tail -n 5 ../logs/frontend.log 2>/dev/null || echo "No hay logs del frontend aún"
}

# Mostrar logs iniciales
show_logs

# Mantener el script corriendo
echo ""
echo -e "${YELLOW}?? Sistema ejecutándose... (Ctrl+C para salir)${NC}"

# Loop infinito para mantener el script activo
while true; do
    sleep 10

    # Verificar que ambos procesos sigan corriendo
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}? Backend se detuvo inesperadamente${NC}"
        cleanup
        exit 1
    fi

    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}? Frontend se detuvo inesperadamente${NC}"
        cleanup
        exit 1
    fi
done
