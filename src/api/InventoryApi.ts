import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendInventoryItem {
  idproducto: number;
  nombre_producto: string;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  ultima_edicion: string;
  estado: number;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  cantidad: number;
  margen: number;
  margenPorcentaje: number;
  ultimaEdicion: string;
  stockMinimo: number;
  estado: number;
}

export interface InventoryResponse {
  items: InventoryItem[];
  totalCount: number;
}

export interface Category {
  id: string;
  nombre: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getInventory = async (
  searchTerm?: string, 
  lowMarginOnly?: boolean,
  categories?: string[]
): Promise<InventoryResponse> => {
  try {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (lowMarginOnly) params.lowMarginOnly = true;
    if (categories && categories.length > 0) params.categories = categories.join(',');

    const response = await api.get<BackendInventoryItem[]>("/inventory/inventory", { params });
    
    const items: InventoryItem[] = response.data.map((item) => {
      const precioCompra = parseFloat(item.precio_compra);
      const precioVenta = parseFloat(item.precio_venta);
      const margen = precioVenta - precioCompra;
      const margenPorcentaje = precioCompra > 0 ? (margen / precioCompra) * 100 : 0;

      return {
        id: item.idproducto.toString(),
        nombre: item.nombre_producto,
        precioCompra,
        precioVenta,
        cantidad: item.stock,
        margen,
        margenPorcentaje,
        ultimaEdicion: new Date(item.ultima_edicion).toLocaleDateString(),
        stockMinimo: item.stock_minimo,
        estado: item.estado
      };
    });

    return {
      items,
      totalCount: items.length
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("No se pudieron cargar los datos del inventario");
  }
};

export const getLowMarginCount = async (): Promise<number> => {
  try {
    const response = await api.get<{ count: number }>("/inventory/inventory/low-margin-count");
    return response.data.count;
  } catch (error) {
    console.error("Error fetching low margin count:", error);
    return 0;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<Category[]>("/inventory/categories");
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

function mapBackendInventoryItem(item: BackendInventoryItem): InventoryItem {
  const precioCompra = parseFloat(item.precio_compra);
  const precioVenta = parseFloat(item.precio_venta);
  const margen = precioVenta - precioCompra;
  const margenPorcentaje = precioCompra > 0 ? (margen / precioCompra) * 100 : 0;

  return {
    id: item.idproducto.toString(),
    nombre: item.nombre_producto,
    precioCompra,
    precioVenta,
    cantidad: item.stock,
    margen,
    margenPorcentaje,
    ultimaEdicion: new Date(item.ultima_edicion).toLocaleDateString(),
    stockMinimo: item.stock_minimo,
    estado: item.estado
  };
}