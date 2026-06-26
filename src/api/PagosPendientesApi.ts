import axios from "axios";
import { getUserId, getUserRole, getUserBodega, getCurrentUser } from "./AuthApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendProductoCotizado {
  idproducto: number;
  nombre: string;
  precio_unitario: string;
  cantidad: number;
  cantidad_pendiente: number;
  imagen?: string;
}

interface BackendPagoPendiente {
  idcotizacion: number;
  fecha: string;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_pago: "Pago por Adelantado" | "Mitad de Pago";
  total: string;
  abono: string;
  saldo: string;
  productos: BackendProductoCotizado[];
  pagado: boolean;
  entregado: boolean;
  idbodega?: number;
  bodega_nombre?: string;
  usuario_nombre?: string;
  usuario_login?: string;
}

export interface ProductoCotizado {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  cantidadEntregada: number;
  color?: string;
  imagen: string;
}

export interface PagoPendiente {
  id: string;
  fecha: string;
  cliente: string;
  telefono: string;
  tipoPago: "pago-adelantado" | "mitad-adelanto";
  monto: number;
  saldo: number;
  productos: ProductoCotizado[];
  pagado: boolean;
  entregado: boolean;
  idbodega?: number;
  bodegaNombre?: string;
  usuarioNombre?: string;
  usuarioLogin?: string;
}

export interface PagoRequest {
  monto: number;
  metodoPago: "efectivo" | "qr";
  idUsuario: number;
}

export interface EntregaRequest {
  productos: Array<{
    idproducto: number;
    cantidadEntregada: number;
  }>;
  montoPago?: number;
  metodoPago?: "efectivo" | "qr";
  idUsuario: number;
}

// Crear una instancia de axios con la configuración base
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a TODAS las solicitudes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log(`🔑 [${config.method?.toUpperCase()} ${config.url}] Token:`, token ? "✅ Presente" : "❌ No encontrado");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`✅ Token agregado a ${config.url}`);
    } else {
      console.warn(`⚠️ No hay token para ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("❌ Error en interceptor de request:", error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Respuesta exitosa: ${response.status} - ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ Error en respuesta: ${error.response?.status} - ${error.response?.config?.url}`);
    console.error("Detalles del error:", error.response?.data);
    
    // Si es error 401 y no estamos en login, redirigir
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      console.warn("🔒 Sesión expirada, redirigiendo a login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userBodega");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const getPagosPendientes = async (): Promise<PagoPendiente[]> => {
  try {
    console.log("🚀 Iniciando getPagosPendientes");
    
    // Verificar que tenemos token
    const token = localStorage.getItem("token");
    console.log("🔑 Token en localStorage:", token ? `✅ ${token.substring(0, 20)}...` : "❌ No encontrado");
    
    if (!token) {
      console.warn("⚠️ No hay token, redirigiendo a login");
      window.location.href = "/login";
      throw new Error("No hay token de autenticación");
    }

    // Obtener información del usuario usando tus funciones de AuthApi
    const idusuario = getUserId();
    const rol = getUserRole();
    const idbodega = getUserBodega();
    const user = getCurrentUser();
    
    console.log("👤 Información del usuario:");
    console.log("  - ID:", idusuario);
    console.log("  - Rol:", rol);
    console.log("  - Bodega:", idbodega);
    console.log("  - User completo:", user);
    
    // Construir URL con filtro de bodega (solo si es Admin)
    let url = "/pagos/pendientes";
    const params = new URLSearchParams();
    
    // Si es Admin y tiene bodega, enviar el filtro
    if (rol === 'Admin' && idbodega) {
      params.append('bodega', idbodega.toString());
      console.log(`🏢 Filtrando por bodega: ${idbodega}`);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log(`📤 Haciendo request GET a: ${url}`);
    
    const response = await api.get<BackendPagoPendiente[]>(url);
    
    console.log(`✅ Pagos pendientes encontrados: ${response.data.length}`);
    
    return response.data.map((pago) => ({
      id: `COT-${pago.idcotizacion.toString().padStart(3, '0')}`,
      fecha: pago.fecha,
      cliente: pago.cliente_nombre,
      telefono: pago.cliente_telefono || "",
      tipoPago: pago.tipo_pago === "Pago por Adelantado" ? "pago-adelantado" : "mitad-adelanto",
      monto: parseFloat(pago.total),
      saldo: parseFloat(pago.saldo),
      productos: pago.productos.map((producto) => ({
        id: producto.idproducto.toString(),
        nombre: producto.nombre,
        precio: parseFloat(producto.precio_unitario),
        cantidad: producto.cantidad,
        cantidadEntregada: producto.cantidad - producto.cantidad_pendiente,
        imagen: producto.imagen || "/lovable-uploads/default-product.png"
      })),
      pagado: parseFloat(pago.saldo) <= 0,
      entregado: pago.productos.every(p => p.cantidad_pendiente === 0),
      idbodega: pago.idbodega,
      bodegaNombre: pago.bodega_nombre || "Bodega Principal",
      usuarioNombre: pago.usuario_nombre || "Usuario desconocido",
      usuarioLogin: pago.usuario_login || "usuario"
    }));
  } catch (error: any) {
    console.error("❌ Error en getPagosPendientes:", error);
    console.error("Detalles:", error.response?.data || error.message);
    
    // Si el error es 401, redirigir a login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userBodega");
      window.location.href = "/login";
      throw new Error("Sesión expirada, por favor inicie sesión nuevamente");
    }
    
    throw new Error("No se pudieron cargar los pagos pendientes");
  }
};

export const procesarPago = async (cotizacionId: string, pagoRequest: PagoRequest): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    console.log(`💳 Procesando pago - Cotización: ${idcotizacion}, Monto: ${pagoRequest.monto}`);
    await api.post(`/pagos/procesar-pago/${idcotizacion}`, pagoRequest);
    console.log(`✅ Pago procesado exitosamente`);
  } catch (error: any) {
    console.error("❌ Error processing payment:", error);
    throw new Error(error.response?.data?.message || "No se pudo procesar el pago");
  }
};

export const actualizarEntregas = async (cotizacionId: string, entregaRequest: EntregaRequest): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    console.log(`📦 Actualizando entregas - Cotización: ${idcotizacion}`);
    await api.put(`/pagos/actualizar-entregas/${idcotizacion}`, entregaRequest);
    console.log(`✅ Entregas actualizadas exitosamente`);
  } catch (error: any) {
    console.error("❌ Error updating deliveries:", error);
    throw new Error(error.response?.data?.message || "No se pudieron actualizar las entregas");
  }
};

export const marcarComoEntregado = async (cotizacionId: string): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    console.log(`✅ Marcando como entregado - Cotización: ${idcotizacion}`);
    await api.patch(`/pagos/marcar-entregado/${idcotizacion}`);
    console.log(`✅ Cotización marcada como entregada`);
  } catch (error: any) {
    console.error("❌ Error marking as delivered:", error);
    throw new Error(error.response?.data?.message || "No se pudo marcar como entregado");
  }
};

export const eliminarPago = async (cotizacionId: string): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    console.log(`🗑️ Eliminando cotización - ID: ${idcotizacion}`);
    await api.delete(`/pagos/eliminar/${idcotizacion}`);
    console.log(`✅ Cotización eliminada exitosamente`);
  } catch (error: any) {
    console.error("❌ Error deleting payment:", error);
    throw new Error(error.response?.data?.message || "No se pudo eliminar el pago");
  }
};

export default api;