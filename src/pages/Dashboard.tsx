import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { isAuthenticated, getCurrentUser } from "@/api/AuthApi";

export type DashboardView = "vender" | "notas" | "productos" | "inventario" | "ventas" | "cotizacion" | "pagos-pendientes" | "caja" | "registra-movimiento" | "reportes" | "ecommerce" | "configuracion" | "alertas" | "usuarios" | "bodega" | "clientes";

// Definir vistas permitidas por rol
const roleViewPermissions = {
  admin: ["bodega", "inventario", "ventas", "cotizacion", "pagos-pendientes", "clientes", "usuarios", "caja", "registra-movimiento", "reportes", "ecommerce", "alertas"],
  asistente: ["vender", "productos", "ventas", "cotizacion", "pagos-pendientes", "clientes"]
};

// Vista por defecto según rol
const getDefaultView = (role: string): DashboardView => {
  if (role === "asistente") return "vender";
  return "bodega"; // Admin ve Bodega primero
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isAuthenticated()) {
        navigate("/login");
        return;
      }

      try {
        const user = getCurrentUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // Validar que la ruta actual sea permitida para el rol
        const userRole = user.rol.toLowerCase();
        const pathSegments = location.pathname.split('/');
        const currentPath = pathSegments[pathSegments.length - 1];

        // Si es la ruta raíz del dashboard o está vacía
        if (!currentPath || currentPath === "dashboard") {
          const defaultView = getDefaultView(userRole);
          navigate(`/dashboard/${defaultView}`, { replace: true });
          return;
        }

        // Verificar si la ruta actual está permitida para el rol
        const allowedViews = roleViewPermissions[userRole as keyof typeof roleViewPermissions] || [];
        
        if (!allowedViews.includes(currentPath)) {
          // Si no tiene permiso, redirigir a su vista por defecto
          const defaultView = getDefaultView(userRole);
          navigate(`/dashboard/${defaultView}`, { replace: true });
        }
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        navigate("/login");
      }
    };

    checkAuthentication();
  }, [navigate, location]);

  const getCurrentViewFromPath = (): DashboardView => {
    const pathSegments = location.pathname.split('/');
    const path = pathSegments[pathSegments.length - 1];
    const user = getCurrentUser();
    const userRole = user?.rol.toLowerCase() || "admin";
    
    // Si no hay ruta o es la raíz, devolver la vista por defecto
    if (!path || path === "dashboard") {
      return getDefaultView(userRole);
    }
    
    // Verificar si la ruta actual está permitida
    const allowedViews = roleViewPermissions[userRole as keyof typeof roleViewPermissions] || [];
    if (allowedViews.includes(path)) {
      return path as DashboardView;
    }
    
    // Si no está permitida, devolver la vista por defecto
    return getDefaultView(userRole);
  };

  const handleViewChange = (view: DashboardView) => {
    const user = getCurrentUser();
    const userRole = user?.rol.toLowerCase() || "admin";
    
    // Verificar si la vista está permitida para el rol
    const allowedViews = roleViewPermissions[userRole as keyof typeof roleViewPermissions] || [];
    
    if (!allowedViews.includes(view)) {
      // Si no tiene permiso, redirigir a su vista por defecto
      const defaultView = getDefaultView(userRole);
      navigate(`/dashboard/${defaultView}`, { replace: true });
      return;
    }
    
    // Navegar a la ruta
    navigate(`/dashboard/${view}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          currentView={getCurrentViewFromPath()} 
          onViewChange={handleViewChange} 
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;