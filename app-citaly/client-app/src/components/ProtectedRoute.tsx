import { useAuth } from '../hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  console.log("?? ProtectedRoute - Estado:", {
    isLoading,
    isAuthenticated: !!user,
    user: user ? `${user.name} (${user.email})` : 'No autenticado'
  });

  // Mostrar spinner mientras carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si el usuario está autenticado, permitir acceso
  if (user) {
    console.log("? Usuario autenticado, permitiendo acceso");
    return <Outlet />;
  }

  // Si no hay usuario, redirigir a login
  console.log("? No hay usuario autenticado, redirigiendo a login");
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
