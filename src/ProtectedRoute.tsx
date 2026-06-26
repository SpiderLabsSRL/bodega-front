import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "@/api/AuthApi";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Definir qué rutas son accesibles por rol
const routePermissions = {
  admin: [
    "bodega", "inventario", "ventas", "cotizacion", 
    "pagos-pendientes", "clientes", "usuarios"
  ],
  asistente: [
    "vender", "productos", "ventas", "cotizacion", 
    "pagos-pendientes", "clientes"
  ]
};

// Ruta por defecto según rol
const getDefaultRoute = (role: string): string => {
  if (role === "asistente") return "/dashboard/vender";
  return "/dashboard/bodega";
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const user = getCurrentUser();
  const token = localStorage.getItem("token");

  // Verificar autenticación
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Extraer la ruta actual - obtener el último segmento de la URL
  const pathSegments = location.pathname.split("/");
  const currentRoute = pathSegments[pathSegments.length - 1];
  
  // Si es la ruta raíz del dashboard, permitir
  if (currentRoute === "dashboard" || currentRoute === "") {
    const defaultRoute = getDefaultRoute(user.rol.toLowerCase());
    return <Navigate to={defaultRoute} replace />;
  }

  const userRole = user.rol.toLowerCase();
  
  // Verificar si el usuario tiene permiso para esta ruta
  const hasPermission = routePermissions[userRole as keyof typeof routePermissions]?.includes(currentRoute);

  // Si NO tiene permiso, redirigir a su ruta por defecto
  if (!hasPermission) {
    const defaultRoute = getDefaultRoute(userRole);
    console.log(`Usuario ${userRole} intentó acceder a ${currentRoute}, redirigiendo a ${defaultRoute}`);
    return <Navigate to={defaultRoute} replace />;
  }

  // Si tiene permiso, mostrar el contenido
  return <>{children}</>;
}