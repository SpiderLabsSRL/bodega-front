// src/api/CajaApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendTransaccionCaja {
  idtransaccion: number;
  tipo_movimiento: string;
  descripcion: string;
  monto: string;
  fecha: string; 
  idusuario: number;
  idventa: number | null;
  idtransferencia: number | null;
  nombres: string;
  apellidos: string;
  tipo_caja: string;
  idcaja: number;
}

export interface TransaccionCaja {
  idtransaccion: number;
  tipo_movimiento: string;
  descripcion: string;
  monto: number;
  fecha: string | Date;
  idusuario: number;
  idventa: number | null;
  idtransferencia: number | null;
  empleado: string;
  tipo_caja: string;
  idcaja: number;
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

export interface TransferenciaCaja {
  idtransferencia: number;
  idcaja_origen: number;
  idcaja_destino: number;
  monto: number;
  tipo: string;
  descripcion: string;
  estado: 'pendiente' | 'aprobada' | 'observada';
  idusuario_solicitante: number;
  idusuario_aprobador: number | null;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  observacion: string | null;
  solicitante_nombre: string;
  solicitante_apellidos: string;
  caja_origen_tipo: string;
  caja_destino_tipo: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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
      tipo_movimiento: transaccion.tipo_movimiento,
      descripcion: transaccion.descripcion,
      monto: parseFloat(transaccion.monto),
      fecha: transaccion.fecha,
      idusuario: transaccion.idusuario,
      idventa: transaccion.idventa,
      idtransferencia: transaccion.idtransferencia,
      empleado: `${transaccion.nombres} ${transaccion.apellidos}`,
      tipo_caja: transaccion.tipo_caja,
      idcaja: transaccion.idcaja,
    }));
  } catch (error) {
    console.error("Error fetching transacciones caja:", error);
    throw new Error("No se pudieron cargar las transacciones de caja");
  }
};

export const getEstadoCajaActual = async (params: GetSaldoParams): Promise<SaldoActualResponse> => {
  try {
    const response = await api.get<SaldoActualResponse>("/caja/estado-actual", {
      params: {
        idbodega: params.idbodega,
        tipoCaja: params.tipoCaja,
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching estado caja:", error);
    return {
      estado: "cerrada",
      monto_final: "0.00"
    };
  }
};

export const getSaldoActual = async (params: GetSaldoParams): Promise<{estado: string, monto_final: string, idcaja: number | null}> => {
  try {
    const response = await api.get<{estado: string, monto_final: string, idcaja: number | null}>("/cash/status", {
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
      monto_final: "0.00",
      idcaja: null
    };
  }
};

export const getAdminUsers = async (): Promise<{id: number; nombre: string; usuario: string}[]> => {
  try {
    const response = await api.get<{id: number; nombre: string; usuario: string}[]>("/caja/usuariosAdmins");
    return response.data;
  } catch (error) {
    console.error("Error fetching usuarios caja:", error);
    throw new Error("No se pudieron cargar los usuarios");
  }
};

export const getUsuariosCaja = async (): Promise<{idusuario: number; empleado_nombre: string}[]> => {
  try {
    const response = await api.get<{idusuario: number; empleado_nombre: string}[]>("/caja/usuarios");
    return response.data;
  } catch (error) {
    console.error("Error fetching usuarios caja:", error);
    throw new Error("No se pudieron cargar los usuarios");
  }
};

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

// Crear transacción de caja (registrar movimiento)
export const createTransaccionCaja = async (data: {
  tipoCaja: string;
  tipoMovimiento: string;
  monto: number;
  descripcion: string;
  usuarioTransferencia?: string;
  idbodega: number;
  idusuario: number;
}): Promise<any> => {
  try {
    const response = await api.post("/caja/transacciones", data);
    return response.data;
  } catch (error) {
    console.error("Error creating transaccion caja:", error);
    throw new Error(error.response?.data?.error || "No se pudo registrar el movimiento");
  }
};

// Obtener transferencias pendientes
export const getTransferenciasPendientes = async (): Promise<TransferenciaCaja[]> => {
  try {
    const response = await api.get<TransferenciaCaja[]>("/caja/transferencias/pendientes");
    return response.data;
  } catch (error) {
    console.error("Error fetching transferencias pendientes:", error);
    throw new Error("No se pudieron cargar las transferencias pendientes");
  }
};

// Aprobar transferencia
export const aprobarTransferencia = async (idtransferencia: number, idusuario_aprobador: number): Promise<any> => {
  try {
    const response = await api.put(`/caja/transferencias/${idtransferencia}/aprobar`, {
      idusuario_aprobador
    });
    return response.data;
  } catch (error) {
    console.error("Error aprobando transferencia:", error);
    throw new Error(error.response?.data?.error || "No se pudo aprobar la transferencia");
  }
};

// Obtener información de una caja
export const getCajaInfo = async (idcaja: number): Promise<any> => {
  try {
    const response = await api.get(`/caja/${idcaja}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching caja info:", error);
    throw new Error("No se pudo obtener la información de la caja");
  }
};