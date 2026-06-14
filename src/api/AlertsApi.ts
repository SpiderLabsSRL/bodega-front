import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendAlert {
  idproducto: number;
  nombre: string;
  descripcion: string | null;
  idubicacion: number;
  nombre_ubicacion: string;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo: number;
  estado: number;
  imagen: string;
}

export interface Alert {
  id: number;
  producto: string;
  descripcion: string | null;
  ubicacion: string;
  cantidad: number;
  stockMinimo: number;
  imagen: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const getDefaultImage = (productName: string): string => {
  return "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
};

export const getLowStockAlerts = async (): Promise<Alert[]> => {
  try {
    const response = await api.get<BackendAlert[]>("/alerts/low-stock");
    
    return response.data.map(producto => ({
      id: producto.idproducto,
      producto: producto.nombre,
      ubicacion: producto.nombre_ubicacion,
      descripcion: producto.descripcion,
      cantidad: producto.stock,
      stockMinimo: producto.stock_minimo,
      imagen: producto.imagen ? 
        producto.imagen
        :
        getDefaultImage(producto.nombre)
    }));
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    throw new Error("No se pudieron cargar las alertas de stock bajo");
  }
};

export const getCriticalStockAlerts = async (): Promise<Alert[]> => {
  try {
    const response = await api.get<BackendAlert[]>("/alerts/critical-stock");
    
    return response.data.map(producto => ({
      id: producto.idproducto,
      producto: producto.nombre,
      ubicacion: producto.nombre_ubicacion,
      descripcion: producto.descripcion,
      cantidad: producto.stock,
      stockMinimo: producto.stock_minimo,
      imagen: producto.imagen ? 
        producto.imagen
        :
        getDefaultImage(producto.nombre)
    }));
  } catch (error) {
    console.error("Error fetching critical stock alerts:", error);
    throw new Error("No se pudieron cargar las alertas de stock crítico");
  }
};