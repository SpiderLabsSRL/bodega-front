// src/api/ManagementSectionApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para cada tipo de dato
interface BackendItem {
  id: number;
  nombre: string;
  estado: number;
}

interface BackendUbicacion {
  id: number;
  nombre: string;
  estado: number;
  idbodega: number | null;
}

export interface ManagementItem {
  id: number;
  nombre: string;
  estado: number;
}

export interface ManagementItemRequest {
  nombre: string;
}

export interface UbicacionRequest {
  nombre: string;
  idbodega?: number | null;
}

export interface UbicacionItem {
  id: number;
  nombre: string;
  estado: number;
  idbodega: number | null;
}

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Mapeador genérico
function mapBackendItem(item: BackendItem): ManagementItem {
  return {
    id: item.id,
    nombre: item.nombre,
    estado: item.estado,
  };
}

function mapBackendUbicacion(item: BackendUbicacion): UbicacionItem {
  return {
    id: item.id,
    nombre: item.nombre,
    estado: item.estado,
    idbodega: item.idbodega,
  };
}

// ============================================
// API para Categorías
// ============================================

export const getCategorias = async (): Promise<ManagementItem[]> => {
  try {
    const response = await api.get<BackendItem[]>("/management/categorias");
    return response.data.map(mapBackendItem);
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

export const createCategoria = async (item: ManagementItemRequest): Promise<ManagementItem> => {
  try {
    const response = await api.post<BackendItem>("/management/categorias", item);
    return mapBackendItem(response.data);
  } catch (error) {
    console.error("Error creating categoria:", error);
    throw new Error("No se pudo crear la categoría");
  }
};

export const updateCategoria = async (id: number, item: ManagementItemRequest): Promise<ManagementItem> => {
  try {
    const response = await api.put<BackendItem>(`/management/categorias/${id}`, item);
    return mapBackendItem(response.data);
  } catch (error) {
    console.error("Error updating categoria:", error);
    throw new Error("No se pudo actualizar la categoría");
  }
};

export const deleteCategoria = async (id: number): Promise<void> => {
  try {
    await api.delete(`/management/categorias/${id}`);
  } catch (error) {
    console.error("Error deleting categoria:", error);
    throw new Error("No se pudo eliminar la categoría");
  }
};

// ============================================
// API para Ubicaciones
// ============================================

export const getUbicaciones = async (idbodega?: number | null): Promise<UbicacionItem[]> => {
  try {
    let url = "/management/ubicaciones";
    if (idbodega !== undefined && idbodega !== null) {
      url = `/management/ubicaciones?bodega=${idbodega}`;
    }
    const response = await api.get<BackendUbicacion[]>(url);
    return response.data.map(mapBackendUbicacion);
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const getUbicacionesAll = async (): Promise<UbicacionItem[]> => {
  try {
    const response = await api.get<BackendUbicacion[]>("/management/ubicaciones");
    return response.data.map(mapBackendUbicacion);
  } catch (error) {
    console.error("Error fetching all ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const createUbicacion = async (item: UbicacionRequest): Promise<UbicacionItem> => {
  try {
    const response = await api.post<BackendUbicacion>("/management/ubicaciones", {
      nombre: item.nombre,
      idbodega: item.idbodega !== undefined ? item.idbodega : null
    });
    return mapBackendUbicacion(response.data);
  } catch (error) {
    console.error("Error creating ubicacion:", error);
    throw new Error("No se pudo crear la ubicación");
  }
};

export const updateUbicacion = async (id: number, item: UbicacionRequest): Promise<UbicacionItem> => {
  try {
    const response = await api.put<BackendUbicacion>(`/management/ubicaciones/${id}`, {
      nombre: item.nombre,
      idbodega: item.idbodega !== undefined ? item.idbodega : null
    });
    return mapBackendUbicacion(response.data);
  } catch (error) {
    console.error("Error updating ubicacion:", error);
    throw new Error("No se pudo actualizar la ubicación");
  }
};

export const deleteUbicacion = async (id: number): Promise<void> => {
  try {
    await api.delete(`/management/ubicaciones/${id}`);
  } catch (error) {
    console.error("Error deleting ubicacion:", error);
    throw new Error("No se pudo eliminar la ubicación");
  }
};