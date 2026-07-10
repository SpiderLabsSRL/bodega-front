// src/api/CajaApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendTransaccionCaja {
  idtransaccion: number;
  idestado_caja: number;
  tipo_movimiento: string;
  descripcion: string;
  monto: string;
  fecha: string; 
  idusuario: number;
  idventa: number | null;
  nombres: string;
  apellidos: string;
}

export interface TransaccionCaja {
  idtransaccion: number;
  idestado_caja: number;
  tipo_movimiento: string;
  descripcion: string;
  monto: number;
  fecha: string | Date;
  idusuario: number;
  idventa: number | null;
  empleado: string;
}

export interface EstadoCaja {
  idestado_caja: number;
  estado: string;
  monto_inicial: number;
  monto_final: number;
  idusuario: number;
}

interface SaldoActualResponse {
  estado: string;
  monto_final: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener todas las transacciones de caja (para Admin)
interface GetTransaccionesCajaParams {
  idusuario?: number;
  fecha?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tipoCaja?: string;
}

interface GetSaldoParams {
  idbodega?: number;
  tipoCaja: string;
}

export const getTransaccionesCaja = async (
  params: GetTransaccionesCajaParams = {}
): Promise<TransaccionCaja[]> => {
  try {
    const response = await api.get<BackendTransaccionCaja[]>("/caja/transacciones", {
      params: {
        idusuario: params.idusuario,
        fecha: params.fecha,
        fechaInicio: params.fechaInicio,
        fechaFin: params.fechaFin,
        tipoCaja: params.tipoCaja,
      },
    });

    return response.data.map((transaccion) => ({
      idtransaccion: transaccion.idtransaccion,
      idestado_caja: transaccion?.idestado_caja || 1,
      tipo_movimiento: transaccion.tipo_movimiento,
      descripcion: transaccion.descripcion,
      monto: parseFloat(transaccion.monto),
      fecha: transaccion.fecha,
      idusuario: transaccion.idusuario,
      idventa: transaccion.idventa,
      empleado: `${transaccion.nombres} ${transaccion.apellidos}`,
    }));
  } catch (error) {
    console.error("Error fetching transacciones caja:", error);
    throw new Error("No se pudieron cargar las transacciones de caja");
  }
};

// Obtener estado actual de caja
export const getEstadoCajaActual = async (): Promise<EstadoCaja | null> => {
  try {
    const response = await api.get<EstadoCaja>("/caja/estado-actual");
    return {
      ...response.data,
      monto_inicial: parseFloat(response.data.monto_inicial as any),
      monto_final: parseFloat(response.data.monto_final as any),
    };
  } catch (error) {
    console.error("Error fetching estado caja:", error);
    return null;
  }
};

// Obtener saldo actual
export const getSaldoActual = async (params : GetSaldoParams): Promise<SaldoActualResponse> => {
  try {
    const response = await api.get<SaldoActualResponse>("/cash/status", {
      params: {
        idbodega: params.idbodega,
        tipoCaja: params.tipoCaja,
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching saldo actual:", error);
    return {
      estado: "cerrada",
      monto_final: "0.00"
    };
  }
};

// Obtener usuarios únicos para filtros
export const getUsuariosCaja = async (): Promise<{idusuario: number; empleado_nombre: string}[]> => {
  try {
    const response = await api.get<{idusuario: number; empleado_nombre: string}[]>("/caja/usuarios");
    return response.data;
  } catch (error) {
    console.error("Error fetching usuarios caja:", error);
    throw new Error("No se pudieron cargar los usuarios");
  }
};

// Obtener información del usuario actual
export const getCurrentUser = async (): Promise<{ idusuario: number; rol: string; nombres: string; apellidos: string }> => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user;
    }
    
    return {
      idusuario: 1,
      rol: "Admin",
      nombres: "Usuario",
      apellidos: "Demo"
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return {
      idusuario: 1,
      rol: "Admin",
      nombres: "Usuario",
      apellidos: "Demo"
    };
  }
};