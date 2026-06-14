import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para cada tipo de dato
interface BackendItem {
  id: number;
  nombre: string;
  estado: number;
}

export interface ManagementItem {
  id: number;
  nombre: string;
  estado: number;
}

export interface ManagementItemRequest {
  nombre: string;
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

// API para Categorías
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

// API para Ubicaciones
export const getUbicaciones = async (): Promise<ManagementItem[]> => {
  try {
    const response = await api.get<BackendItem[]>("/management/ubicaciones");
    return response.data.map(mapBackendItem);
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const createUbicacion = async (item: ManagementItemRequest): Promise<ManagementItem> => {
  try {
    const response = await api.post<BackendItem>("/management/ubicaciones", item);
    return mapBackendItem(response.data);
  } catch (error) {
    console.error("Error creating ubicacion:", error);
    throw new Error("No se pudo crear la ubicación");
  }
};

export const updateUbicacion = async (id: number, item: ManagementItemRequest): Promise<ManagementItem> => {
  try {
    const response = await api.put<BackendItem>(`/management/ubicaciones/${id}`, item);
    return mapBackendItem(response.data);
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
