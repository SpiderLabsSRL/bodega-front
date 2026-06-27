// src/api/VentasApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface BackendUsuario {
  idusuario: number;
  nombres: string;
  apellidos: string;
  usuario: string;
}

export interface BackendBodega {
  idbodega: number;
  nombre: string;
  tipo: string;
}

interface BackendDetalleVenta {
  iddetalle_venta: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: string;
  subtotal_linea: string;
  nombre_producto: string;
}

interface BackendVenta {
  idventa: number;
  fecha_hora: string;
  idusuario: number;
  idcliente: number | null;
  idbodega: number;
  descripcion: string;
  sub_total: string;
  descuento: string;
  descripcion_descuento?: string;
  total: string;
  metodo_pago: string;
  usuario_nombre: string;
  usuario_apellidos: string;
  usuario_usuario: string;
  bodega_nombre?: string;
  cliente_nombre?: string;
  detalle: BackendDetalleVenta[];
}

export interface DetalleVenta {
  iddetalle_venta: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  producto: string;
}

export interface Venta {
  id: number;
  fecha: string | Date;
  usuario: string;
  usuario_completo: string;
  usuario_login: string;
  idcliente: number | null;
  cliente: string;
  idbodega?: number;
  bodegaNombre?: string;
  descripcion: string;
  descripcion_descuento?: string;
  detalle: DetalleVenta[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo: string;
}

export interface VentasFiltros {
  empleado?: string;
  metodo?: string;
  bodega?: number;
  fechaEspecifica?: Date;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface TotalesVentas {
  totalGeneral: number;
  totalEfectivo: number;
  totalQR: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const getBodegas = async (): Promise<BackendBodega[]> => {
  try {
    const response = await api.get<BackendBodega[]>("/ventas/bodegas");
    return response.data;
  } catch (error) {
    console.error("Error fetching bodegas:", error);
    throw new Error("No se pudieron cargar las bodegas");
  }
};

export const getUsuariosVentas = async (): Promise<BackendUsuario[]> => {
  try {
    const response = await api.get<BackendUsuario[]>("/ventas/usuarios");
    return response.data;
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    throw new Error("No se pudieron cargar los usuarios");
  }
};

// Función principal para obtener ventas
export const getVentas = async (filtros?: VentasFiltros): Promise<Venta[]> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.bodega) {
      params.bodega = filtros.bodega;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = formatDateForAPI(filtros.fechaEspecifica);
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = formatDateForAPI(filtros.fechaInicio);
      params.fechaFin = formatDateForAPI(filtros.fechaFin);
    }

    const response = await api.get<BackendVenta[]>("/ventas/ventas", { params });
    
    return response.data.map((venta) => ({
      id: venta.idventa,
      fecha: venta.fecha_hora,
      usuario: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_completo: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_login: venta.usuario_usuario,
      idcliente: venta.idcliente,
      cliente: venta.cliente_nombre || "No especificado",
      idbodega: venta.idbodega,
      bodegaNombre: venta.bodega_nombre || "N/A",
      descripcion: venta.descripcion,
      descripcion_descuento: venta.descripcion_descuento,
      detalle: venta.detalle.map((detalle) => ({
        iddetalle_venta: detalle.iddetalle_venta,
        idproducto: detalle.idproducto,
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal_linea: parseFloat(detalle.subtotal_linea),
        producto: detalle.nombre_producto || "Producto sin nombre"
      })),
      subtotal: parseFloat(venta.sub_total),
      descuento: parseFloat(venta.descuento),
      total: parseFloat(venta.total),
      metodo: venta.metodo_pago
    }));
  } catch (error) {
    console.error("Error fetching ventas:", error);
    throw new Error("No se pudieron cargar las ventas");
  }
};

export const getTotalesVentas = async (filtros?: VentasFiltros): Promise<TotalesVentas> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.bodega) {
      params.bodega = filtros.bodega;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = formatDateForAPI(filtros.fechaEspecifica);
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = formatDateForAPI(filtros.fechaInicio);
      params.fechaFin = formatDateForAPI(filtros.fechaFin);
    }

    const response = await api.get<{
      total_general: string;
      total_efectivo: string;
      total_qr: string;
    }>("/ventas/totales", { params });
    
    return {
      totalGeneral: parseFloat(response.data.total_general),
      totalEfectivo: parseFloat(response.data.total_efectivo),
      totalQR: parseFloat(response.data.total_qr)
    };
  } catch (error) {
    console.error("Error fetching totales:", error);
    throw new Error("No se pudieron cargar los totales");
  }
};

export const getVentasHoyAsistente = async (username: string): Promise<Venta[]> => {
  try {
    const response = await api.get<BackendVenta[]>(`/ventas/ventas/hoy/${username}`);
    
    return response.data.map((venta) => ({
      id: venta.idventa,
      fecha: venta.fecha_hora,
      usuario: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_completo: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_login: venta.usuario_usuario,
      idcliente: venta.idcliente,
      cliente: venta.cliente_nombre || "No especificado",
      idbodega: venta.idbodega,
      bodegaNombre: venta.bodega_nombre || "N/A",
      descripcion: venta.descripcion,
      descripcion_descuento: venta.descripcion_descuento,
      detalle: venta.detalle.map((detalle) => ({
        iddetalle_venta: detalle.iddetalle_venta,
        idproducto: detalle.idproducto,
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal_linea: parseFloat(detalle.subtotal_linea),
        producto: detalle.nombre_producto || "Producto sin nombre"
      })),
      subtotal: parseFloat(venta.sub_total),
      descuento: parseFloat(venta.descuento),
      total: parseFloat(venta.total),
      metodo: venta.metodo_pago
    }));
  } catch (error) {
    console.error("Error fetching ventas hoy:", error);
    throw new Error("No se pudieron cargar las ventas de hoy");
  }
};

// Función auxiliar para formatear fechas para la API
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default api;