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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
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
    const token = localStorage.getItem("token");
    
    if (!token) {
      window.location.href = "/login";
      throw new Error("No hay token de autenticación");
    }

    const idusuario = getUserId();
    const rol = getUserRole();
    const idbodega = getUserBodega();
    const user = getCurrentUser();
    
    let url = "/pagos/pendientes";
    const params = new URLSearchParams();
    
    if (rol === 'Admin' && idbodega) {
      params.append('bodega', idbodega.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get<BackendPagoPendiente[]>(url);
    
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
    await api.post(`/pagos/procesar-pago/${idcotizacion}`, pagoRequest);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "No se pudo procesar el pago");
  }
};

export const actualizarEntregas = async (cotizacionId: string, entregaRequest: EntregaRequest): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    await api.put(`/pagos/actualizar-entregas/${idcotizacion}`, entregaRequest);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "No se pudieron actualizar las entregas");
  }
};

export const marcarComoEntregado = async (cotizacionId: string): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    await api.patch(`/pagos/marcar-entregado/${idcotizacion}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "No se pudo marcar como entregado");
  }
};

export const eliminarPago = async (cotizacionId: string): Promise<void> => {
  try {
    const idcotizacion = parseInt(cotizacionId.replace('COT-', ''));
    await api.delete(`/pagos/eliminar/${idcotizacion}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "No se pudo eliminar el pago");
  }
};

export default api;