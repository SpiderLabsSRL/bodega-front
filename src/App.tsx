import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Importar todas las vistas del dashboard
import { VenderView } from "@/components/dashboard/VenderView";
import { NotasView } from "@/components/dashboard/NotasView";
import { ProductosView } from "@/components/dashboard/ProductosView";
import { InventarioView } from "@/components/dashboard/InventarioView";
import { VentasView } from "@/components/dashboard/VentasView";
import { CotizacionView } from "@/components/dashboard/CotizacionView";
import { PagosPendientesView } from "@/components/dashboard/PagosPendientesView";
import { ReportesView } from "@/components/dashboard/ReportesView";
import { EcommerceView } from "@/components/dashboard/EcommerceView";
import { ConfiguracionView } from "@/components/dashboard/ConfiguracionView";
import { AlertasView } from "@/components/dashboard/AlertasView";
import { GestionUsuariosView } from "@/components/dashboard/GestionUsuariosView";
import { BodegaView } from "@/components/dashboard/BodegaView";
import { ClientesView } from "@/components/dashboard/ClientesView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Ruta principal pública (sin protección) */}
          <Route path="/" element={<Index />} />
          
          {/* Ruta de login */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas protegidas del dashboard - SOLO estas requieren autenticación */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard/vender" replace />} />
            <Route path="vender" element={<VenderView />} />
            <Route path="productos" element={<ProductosView />} />
            <Route path="inventario" element={<InventarioView />} />
            <Route path="ventas" element={<VentasView />} />
            <Route path="cotizacion" element={<CotizacionView />} />
            <Route path="pagos-pendientes" element={<PagosPendientesView />} />
            <Route path="configuracion" element={<ConfiguracionView />} />
            <Route path="usuarios" element={<GestionUsuariosView />} />
            <Route path="bodega" element={<BodegaView />} />
            <Route path="clientes" element={<ClientesView />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;