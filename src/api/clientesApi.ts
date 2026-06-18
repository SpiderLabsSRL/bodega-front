// clientesApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendCliente {
  idcliente: number;
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota: string | null;
  estado: number;
}

export interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota: string;
  estado: boolean;
}

export interface ClienteRequest {
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota?: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getClientes = async (): Promise<Cliente[]> => {
  try {
    const response = await api.get<BackendCliente[]>("/clientes/clientes");
    return response.data.map((cliente) => ({
      id: cliente.idcliente,
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      carnet: cliente.carnet,
      celular: cliente.celular,
      nota: cliente.nota || "",
      estado: cliente.estado === 0,
    }));
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw new Error("No se pudieron cargar los clientes");
  }
};

export const createCliente = async (cliente: ClienteRequest): Promise<Cliente> => {
  try {
    const response = await api.post<BackendCliente>("/clientes/clientes", {
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      carnet: cliente.carnet,
      celular: cliente.celular,
      nota: cliente.nota || "",
    });
    return mapBackendCliente(response.data);
  } catch (error: any) {
    console.error("Error creating client:", error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error("No se pudo crear el cliente");
  }
};

export const updateCliente = async (id: number, cliente: ClienteRequest): Promise<Cliente> => {
  try {
    const response = await api.put<BackendCliente>(`/clientes/clientes/${id}`, {
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      carnet: cliente.carnet,
      celular: cliente.celular,
      nota: cliente.nota || "",
    });
    return mapBackendCliente(response.data);
  } catch (error: any) {
    console.error("Error updating client:", error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error("No se pudo actualizar el cliente");
  }
};

export const deleteCliente = async (id: number): Promise<void> => {
  try {
    await api.delete(`/clientes/clientes/${id}`);
  } catch (error: any) {
    console.error("Error deleting client:", error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error("No se pudo eliminar el cliente");
  }
};

export const toggleClienteStatus = async (id: number): Promise<Cliente> => {
  try {
    const response = await api.patch<BackendCliente>(`/clientes/clientes/${id}/toggle-status`);
    return mapBackendCliente(response.data);
  } catch (error: any) {
    console.error("Error toggling client status:", error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error("No se pudo cambiar el estado del cliente");
  }
};

function mapBackendCliente(cliente: BackendCliente): Cliente {
  return {
    id: cliente.idcliente,
    nombres: cliente.nombres,
    apellidos: cliente.apellidos,
    carnet: cliente.carnet,
    celular: cliente.celular,
    nota: cliente.nota || "",
    estado: cliente.estado === 0,
  };
}