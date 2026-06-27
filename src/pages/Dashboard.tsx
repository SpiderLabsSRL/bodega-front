// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { isAuthenticated, getCurrentUser } from "@/api/AuthApi";
import { BodegaView } from "@/components/dashboard/BodegaView";
import { InventarioView } from "@/components/dashboard/InventarioView";

export type DashboardView = "vender" | "notas" | "productos" | "inventario" | "ventas" | "cotizacion" | "pagos-pendientes" | "caja" | "registra-movimiento" | "reportes" | "ecommerce" | "configuracion" | "alertas" | "usuarios" | "bodega" | "clientes";

// Definir vistas permitidas por rol
const roleViewPermissions = {
  admin: ["bodega", "inventario", "ventas", "cotizacion", "pagos-pendientes", "clientes", "usuarios", "caja", "registra-movimiento", "reportes", "ecommerce", "alertas"],
  asistente: ["vender", "productos", "ventas", "cotizacion", "pagos-pendientes", "clientes"]
};

// Vista por defecto según rol
const getDefaultView = (role: string): DashboardView => {
  if (role === "asistente") return "vender";
  return "bodega";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewParams, setViewParams] = useState<{ 
    searchProductId?: string; 
    searchProductName?: string;
    searchBodegaId?: number;
  }>({});

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

        const userRole = user.rol.toLowerCase();
        const pathSegments = location.pathname.split('/');
        const currentPath = pathSegments[pathSegments.length - 1];

        if (!currentPath || currentPath === "dashboard") {
          const defaultView = getDefaultView(userRole);
          navigate(`/dashboard/${defaultView}`, { replace: true });
          return;
        }

        const allowedViews = roleViewPermissions[userRole as keyof typeof roleViewPermissions] || [];
        
        if (!allowedViews.includes(currentPath)) {
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

  // Escuchar cambios en sessionStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const productId = sessionStorage.getItem('searchProductId');
      const productName = sessionStorage.getItem('searchProductName');
      const bodegaId = sessionStorage.getItem('searchBodegaId');
      
      if (productId && productName) {
        setViewParams({
          searchProductId: productId,
          searchProductName: productName,
          searchBodegaId: bodegaId ? parseInt(bodegaId) : undefined
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getCurrentViewFromPath = (): DashboardView => {
    const pathSegments = location.pathname.split('/');
    const path = pathSegments[pathSegments.length - 1];
    const user = getCurrentUser();
    const userRole = user?.rol.toLowerCase() || "admin";
    
    if (!path || path === "dashboard") {
      return getDefaultView(userRole);
    }
    
    const allowedViews = roleViewPermissions[userRole as keyof typeof roleViewPermissions] || [];
    if (allowedViews.includes(path)) {
      return path as DashboardView;
    }
    
    return getDefaultView(userRole);
  };

  const handleViewChange = (view: DashboardView, params?: { 
    searchProductId?: string; 
    searchProductName?: string;
    searchBodegaId?: number;
  }) => {
    const user = getCurrentUser();
    const userRole = user?.rol.toLowerCase() || "admin";
    
    const allowedViews = roleViewPermissions[userRole as keyof typeof roleViewPermissions] || [];
    
    if (!allowedViews.includes(view)) {
      const defaultView = getDefaultView(userRole);
      navigate(`/dashboard/${defaultView}`, { replace: true });
      return;
    }
    
    if (params) {
      if (params.searchProductId) {
        sessionStorage.setItem('searchProductId', params.searchProductId);
      }
      if (params.searchProductName) {
        sessionStorage.setItem('searchProductName', params.searchProductName);
      }
      if (params.searchBodegaId) {
        sessionStorage.setItem('searchBodegaId', params.searchBodegaId.toString());
      }
      setViewParams({
        searchProductId: params.searchProductId,
        searchProductName: params.searchProductName,
        searchBodegaId: params.searchBodegaId
      });
    } else {
      sessionStorage.removeItem('searchProductId');
      sessionStorage.removeItem('searchProductName');
      sessionStorage.removeItem('searchBodegaId');
      setViewParams({});
    }
    
    navigate(`/dashboard/${view}`);
  };

  const currentView = getCurrentViewFromPath();

  const renderView = () => {
    switch (currentView) {
      case 'inventario':
        return <InventarioView onViewChange={handleViewChange} />;
      case 'bodega':
        return (
          <BodegaView 
            searchProductId={viewParams.searchProductId} 
            searchProductName={viewParams.searchProductName}
            searchBodegaId={viewParams.searchBodegaId}
          />
        );
      default:
        return <Outlet />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          currentView={currentView} 
          onViewChange={handleViewChange} 
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            {renderView()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;