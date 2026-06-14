import axios from "axios";
import { BackendProduct, mapBackendProduct, Product } from "./SalesApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendCotizacion {
  idcotizacion: number;
  vigencia: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  tipo_pago: string;
  sub_total: string;
  descuento: string;
  total: string;
  abono: string;
  saldo: string;
  estado: number;
  idusuario: number;
  fecha_creacion: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
}

interface BackendDetalleCotizacion {
  iddetalle_cotizacion: number;
  idcotizacion: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: string;
  subtotal_linea: string;
  producto_nombre?: string;
}

export interface Cotizacion {
  idcotizacion: number;
  vigencia: string; // Cambiado a string para mostrar formato legible
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  tipo_pago: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";
  sub_total: number;
  descuento: number;
  total: number;
  abono: number;
  saldo: number;
  estado: number;
  idusuario: number;
  fecha_creacion: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
}

export interface DetalleCotizacion {
  iddetalle_cotizacion: number;
  idcotizacion: number;
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  producto_nombre?: string;
}

// MODIFICADO: Actualizado para incluir "Contra Entrega"
export interface CotizacionRequest {
  vigencia: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  tipo_pago: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";
  sub_total: number;
  descuento: number;
  total: number;
  abono: number;
  saldo: number;
  items: Array<{
    idproducto: number;
    cantidad: number;
    precio_unitario: number;
    subtotal_linea: number;
  }>;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Mapeador CORREGIDO para cotizaciones - maneja correctamente la vigencia
function mapBackendCotizacion(cotizacion: BackendCotizacion): Cotizacion {
  // Convertir vigencia a formato legible
  let vigenciaLegible = "No definida";
  
  if (cotizacion.vigencia && cotizacion.vigencia !== "0") {
    const dias = parseInt(cotizacion.vigencia);
    if (!isNaN(dias) && dias > 0) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + dias);
      vigenciaLegible = fecha.toLocaleDateString('es-ES');
    }
  }

  // Formatear fecha de creación
  let fechaCreacionLegible = "Fecha no disponible";
  if (cotizacion.fecha_creacion) {
    try {
      const fecha = new Date(cotizacion.fecha_creacion);
      if (!isNaN(fecha.getTime())) {
        fechaCreacionLegible = fecha.toLocaleDateString('es-ES');
      }
    } catch (error) {
      console.warn("Error formateando fecha de creación:", error);
    }
  }

  return {
    idcotizacion: cotizacion.idcotizacion,
    vigencia: vigenciaLegible, // Usamos el string formateado
    cliente_nombre: cotizacion.cliente_nombre,
    cliente_telefono: cotizacion.cliente_telefono,
    cliente_direccion: cotizacion.cliente_direccion,
    tipo_pago: cotizacion.tipo_pago as "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega",
    sub_total: parseFloat(cotizacion.sub_total),
    descuento: parseFloat(cotizacion.descuento),
    total: parseFloat(cotizacion.total),
    abono: parseFloat(cotizacion.abono),
    saldo: parseFloat(cotizacion.saldo),
    estado: cotizacion.estado,
    idusuario: cotizacion.idusuario,
    fecha_creacion: fechaCreacionLegible,
    usuario_nombre: cotizacion.usuario_nombre,
    usuario_apellido: cotizacion.usuario_apellido
  };
}

function mapBackendDetalleCotizacion(detalle: BackendDetalleCotizacion): DetalleCotizacion {
  return {
    ...detalle,
    precio_unitario: parseFloat(detalle.precio_unitario),
    subtotal_linea: parseFloat(detalle.subtotal_linea)
  };
}

export const createCotizacion = async (cotizacion: CotizacionRequest): Promise<Cotizacion> => {
  try {
    const response = await api.post<BackendCotizacion>("/cotizaciones", cotizacion);
    return mapBackendCotizacion(response.data);
  } catch (error) {
    console.error("Error creating quotation:", error);
    throw new Error("No se pudo crear la cotización");
  }
};

export const getCotizaciones = async (): Promise<Cotizacion[]> => {
  try {
    const response = await api.get<BackendCotizacion[]>("/cotizaciones");
    return response.data.map(mapBackendCotizacion);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    throw new Error("No se pudieron cargar las cotizaciones");
  }
};

// Buscar cotizaciones por nombre o teléfono - CORREGIDO
export const searchCotizaciones = async (query: string): Promise<Cotizacion[]> => {
  try {
    const response = await api.get<BackendCotizacion[]>(`/cotizaciones/search?q=${encodeURIComponent(query)}`);
    return response.data.map(mapBackendCotizacion);
  } catch (error) {
    console.error("Error searching quotations:", error);
    // En lugar de throw, retornar array vacío
    return [];
  }
};

export const getCotizacionById = async (id: number): Promise<{cotizacion: Cotizacion, detalles: DetalleCotizacion[]}> => {
  try {
    const response = await api.get<{
      cotizacion: BackendCotizacion;
      detalles: BackendDetalleCotizacion[];
    }>(`/cotizaciones/${id}`);
    
    return {
      cotizacion: mapBackendCotizacion(response.data.cotizacion),
      detalles: response.data.detalles.map(mapBackendDetalleCotizacion)
    };
  } catch (error) {
    console.error("Error fetching quotation:", error);
    throw new Error("No se pudo cargar la cotización");
  }
};

export const updateCotizacion = async (id: number, cotizacion: Partial<CotizacionRequest>): Promise<Cotizacion> => {
  try {
    const response = await api.put<BackendCotizacion>(`/cotizaciones/${id}`, cotizacion);
    return mapBackendCotizacion(response.data);
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw new Error("No se pudo actualizar la cotización");
  }
};

export const deleteCotizacion = async (id: number): Promise<void> => {
  try {
    await api.delete(`/cotizaciones/${id}`);
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw new Error("No se pudo eliminar la cotización");
  }
};

export default api;