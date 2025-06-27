import { useAuth } from '../hooks/useAuth';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import api from '../lib/api';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("??? ProtectedRoute - Estado de autenticación:", {
      isLoading,
      isAuthenticated: !!user,
      user: user ? `${user.name} (${user.email})` : 'No autenticado'
    });
  }, [user, isLoading]);

  useEffect(() => {
    // Comprueba si hay token pero no hay usuario después de cargar
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && !user && !isLoading) {
      console.log("? Hay un token pero no hay usuario autenticado, intentando restaurar sesión");

      if (savedUser) {
        try {
          // Si hay datos de usuario guardados, establecerlos temporalmente
          const userData = JSON.parse(savedUser);
          console.log("? Encontrados datos de usuario en localStorage:", userData.email);

          // Intentar verificar el token con el backend
          api.get('/auth/verify')
            .then(response => {
              console.log("? Token verificado exitosamente:", response.data);
              // La redirección se manejará automáticamente al restaurar el usuario en AuthContext
              window.location.reload(); // Forzar recarga para asegurar que AuthContext se actualiza
            })
            .catch(error => {
              console.error("? Error al verificar token:", error);
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login', { replace: true });
            });
        } catch (err) {
          console.error("? Error al parsear datos de usuario guardados:", err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
        }
      } else {
        console.error("? No hay datos de usuario guardados, eliminando token");
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  // Si tenemos token pero estamos cargando, mostrar pantalla de carga
  if (isLoading || (!user && localStorage.getItem('token'))) {
    console.log("? Esperando verificación de autenticación o restauración de sesión...");
    // Mostrar spinner o pantalla de carga
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-lg">Cargando...</p>
      </div>
    </div>;
  }

  console.log("?? Decisión de redirección:", user ? "Permitir acceso" : "Redirigir a login");

  // Si el usuario está autenticado, permitir acceso, de lo contrario redirigir a login
  if (user) {
    return <Outlet />;
  } else {
    // Usar window.location para una redirección más fuerte si tenemos problemas
    console.error("? No hay usuario autenticado, redirigiendo a login");
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
