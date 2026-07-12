// src/api/TransferenciaApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface Transferencia {
  id: number;
  fecha: string;
  monto: number | string;
  descripcion: string;
  tipo: string;
  estado: "pendiente" | "aprobada" | "observada" | "rechazada";
  fecha_aprobacion: string | null;
  observacion: string | null;
  idusuario_solicitante: number;
  idusuario_aprobador: number | null;
  usuario_origen: string;
  usuario_aprobador: string | null;
  caja_origen: string;
  tipo_origen: string;
  idmovimiento_egreso?: number | null;
  idmovimiento_reversion?: number | null;
}

export interface CrearTransferenciaRequest {
  idcaja_origen: number;
  monto: number;
  tipo: string;
  descripcion: string;
  idusuario_solicitante: number;
}

// Respuesta al crear transferencia
export interface CrearTransferenciaResponse {
  idtransferencia: number;
  estado: string;
  mensaje: string;
  saldo_anterior: number;
  saldo_actual: number;
  monto_descontado: number;
  idmovimiento_egreso: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getTransferencias = async (userId: number, userRole: string): Promise<Transferencia[]> => {
  try {
    const response = await api.get<Transferencia[]>("/transferencias", {
      params: {
        userId,
        userRole
      }
    });
    return response.data.map(t => ({
      ...t,
      monto: typeof t.monto === 'string' ? parseFloat(t.monto) : t.monto
    }));
  } catch (error) {
    console.error("Error fetching transferencias:", error);
    throw new Error("No se pudieron cargar las transferencias");
  }
};

export const crearTransferencia = async (data: CrearTransferenciaRequest): Promise<CrearTransferenciaResponse> => {
  try {
    const response = await api.post("/transferencias", data);
    return response.data;
  } catch (error: any) {
    console.error("Error creando transferencia:", error);
    throw new Error(error.response?.data?.error || "No se pudo crear la transferencia");
  }
};

export const aprobarTransferencia = async (idtransferencia: number, idusuario_aprobador: number): Promise<any> => {
  try {
    const response = await api.put(`/transferencias/${idtransferencia}/aprobar`, {
      idusuario_aprobador
    });
    return response.data;
  } catch (error: any) {
    console.error("Error aprobando transferencia:", error);
    throw new Error(error.response?.data?.error || "No se pudo aprobar la transferencia");
  }
};

export const observarTransferencia = async (
  idtransferencia: number, 
  idusuario_aprobador: number, 
  observacion: string
): Promise<any> => {
  try {
    const response = await api.put(`/transferencias/${idtransferencia}/observar`, {
      idusuario_aprobador,
      observacion
    });
    return response.data;
  } catch (error: any) {
    console.error("Error observando transferencia:", error);
    throw new Error(error.response?.data?.error || "No se pudo observar la transferencia");
  }
};

export const rechazarTransferencia = async (
  idtransferencia: number, 
  idusuario_aprobador: number, 
  motivo: string
): Promise<any> => {
  try {
    const response = await api.put(`/transferencias/${idtransferencia}/rechazar`, {
      idusuario_aprobador,
      motivo
    });
    return response.data;
  } catch (error: any) {
    console.error("Error rechazando transferencia:", error);
    throw new Error(error.response?.data?.error || "No se pudo rechazar la transferencia");
  }
};

export const getTransferenciaById = async (idtransferencia: number): Promise<Transferencia> => {
  try {
    const response = await api.get<Transferencia>(`/transferencias/${idtransferencia}`);
    const data = response.data;
    return {
      ...data,
      monto: typeof data.monto === 'string' ? parseFloat(data.monto) : data.monto
    };
  } catch (error) {
    console.error("Error fetching transferencia:", error);
    throw new Error("No se pudo obtener la transferencia");
  }
};

export const getTransferenciasPendientes = async (): Promise<Transferencia[]> => {
  try {
    const response = await api.get<Transferencia[]>("/transferencias/pendientes");
    return response.data.map(t => ({
      ...t,
      monto: typeof t.monto === 'string' ? parseFloat(t.monto) : t.monto
    }));
  } catch (error) {
    console.error("Error fetching transferencias pendientes:", error);
    throw new Error("No se pudieron cargar las transferencias pendientes");
  }
};

export const getTransferenciasByUsuario = async (idusuario: number): Promise<Transferencia[]> => {
  try {
    const response = await api.get<Transferencia[]>(`/transferencias/usuario/${idusuario}`);
    return response.data.map(t => ({
      ...t,
      monto: typeof t.monto === 'string' ? parseFloat(t.monto) : t.monto
    }));
  } catch (error) {
    console.error("Error fetching transferencias by usuario:", error);
    throw new Error("No se pudieron cargar las transferencias del usuario");
  }
};

export const countTransferenciasPendientes = async (): Promise<number> => {
  try {
    const response = await api.get<{ total: number }>("/transferencias/pendientes/count");
    return response.data.total;
  } catch (error) {
    console.error("Error counting transferencias pendientes:", error);
    return 0;
  }
};

// Función para obtener el saldo actual de una caja
export const getSaldoCaja = async (idcaja: number): Promise<{ total: number; estado_caja: string }> => {
  try {
    const response = await api.get(`/caja/${idcaja}`);
    return {
      total: parseFloat(response.data.total) || 0,
      estado_caja: response.data.estado_caja || 'cerrada'
    };
  } catch (error) {
    console.error("Error getting caja saldo:", error);
    return { total: 0, estado_caja: 'cerrada' };
  }
};