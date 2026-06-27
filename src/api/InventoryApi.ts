// src/api/InventoryApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendInventoryItem {
  idproducto: number;
  nombre_producto: string;
  codigo_barras: string | null;
  precio_compra: string;
  precio_venta: string;
  stock: number;
  stock_minimo: number;
  ultima_edicion: string;
  estado: number;
  idbodega: number;
  bodega_nombre: string;
  bodegas_stock?: Array<{
    idbodega: number;
    bodega_nombre: string;
    stock: number;
    stock_minimo: number;
  }>;
}

export interface BodegaStock {
  idbodega: number;
  bodegaNombre: string;
  stock: number;
  stockMinimo: number;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  codigo: string;
  precioCompra: number;
  precioVenta: number;
  cantidad: number;
  stockMinimo: number;
  margen: number;
  margenPorcentaje: number;
  ultimaEdicion: string;
  estado: number;
  idbodega: number;
  bodegaNombre: string;
  totalInvertido: number;
  totalGanancia: number;
  bodegasStock: BodegaStock[];
  stockTotal: number;
}

export interface InventoryResponse {
  items: InventoryItem[];
  totalCount: number;
  totalInvertido: number;
  totalGanancia: number;
}

export interface Category {
  id: string;
  nombre: string;
}

export interface SucursalOption {
  id: number;
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
  categories?: string[],
  idbodega?: number
): Promise<InventoryResponse> => {
  try {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (lowMarginOnly) params.lowMarginOnly = true;
    if (categories && categories.length > 0) params.categories = categories.join(',');
    if (idbodega !== undefined && idbodega !== null && idbodega > 0) params.idbodega = idbodega;

    const response = await api.get<BackendInventoryItem[]>("/inventory/inventory", { params });
    
    let totalInvertidoGlobal = 0;
    let totalGananciaGlobal = 0;
    
    const items: InventoryItem[] = response.data.map((item) => {
      const precioCompra = parseFloat(item.precio_compra);
      const precioVenta = parseFloat(item.precio_venta);
      const margen = precioVenta - precioCompra;
      const margenPorcentaje = precioCompra > 0 ? (margen / precioCompra) * 100 : 0;
      
      let stockTotal = item.stock || 0;
      let bodegasStock: BodegaStock[] = [];
      let stockMinimo = item.stock_minimo || 0;
      
      if (item.bodegas_stock && item.bodegas_stock.length > 0) {
        bodegasStock = item.bodegas_stock.map((bs) => ({
          idbodega: bs.idbodega,
          bodegaNombre: bs.bodega_nombre,
          stock: bs.stock,
          stockMinimo: bs.stock_minimo
        }));
        stockTotal = bodegasStock.reduce((sum, bs) => sum + bs.stock, 0);
        // Tomar el stock_minimo de la primera bodega o calcular el mínimo
        stockMinimo = Math.min(...bodegasStock.map(bs => bs.stockMinimo));
      } else {
        bodegasStock = [{
          idbodega: item.idbodega,
          bodegaNombre: item.bodega_nombre || "Sin bodega",
          stock: item.stock || 0,
          stockMinimo: item.stock_minimo || 0
        }];
        stockMinimo = item.stock_minimo || 0;
      }
      
      const totalInvertido = stockTotal * precioCompra;
      const totalGanancia = (stockTotal * precioVenta) - totalInvertido;
      
      totalInvertidoGlobal += totalInvertido;
      totalGananciaGlobal += totalGanancia;

      return {
        id: item.idproducto.toString(),
        nombre: item.nombre_producto,
        codigo: item.codigo_barras || `COD-${item.idproducto}`,
        precioCompra,
        precioVenta,
        cantidad: stockTotal,
        stockMinimo: stockMinimo,
        margen,
        margenPorcentaje,
        ultimaEdicion: new Date(item.ultima_edicion).toLocaleDateString(),
        estado: item.estado,
        idbodega: item.idbodega,
        bodegaNombre: item.bodega_nombre || "Sin bodega",
        totalInvertido,
        totalGanancia,
        bodegasStock,
        stockTotal
      };
    });

    // Agrupar productos por ID cuando se ven todas las bodegas
    let groupedItems = items;
    if (!idbodega) {
      const groupedMap = new Map<string, InventoryItem>();
      
      items.forEach((item) => {
        if (groupedMap.has(item.id)) {
          const existing = groupedMap.get(item.id)!;
          // Combinar bodegasStock
          existing.bodegasStock = [...existing.bodegasStock, ...item.bodegasStock];
          existing.cantidad += item.cantidad;
          existing.totalInvertido += item.totalInvertido;
          existing.totalGanancia += item.totalGanancia;
          // Calcular el stock mínimo más bajo
          existing.stockMinimo = Math.min(existing.stockMinimo, item.stockMinimo);
        } else {
          groupedMap.set(item.id, { ...item });
        }
      });
      
      groupedItems = Array.from(groupedMap.values());
    }

    return {
      items: groupedItems,
      totalCount: groupedItems.length,
      totalInvertido: totalInvertidoGlobal,
      totalGanancia: totalGananciaGlobal
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("No se pudieron cargar los datos del inventario");
  }
};

export const getLowMarginCount = async (idbodega?: number): Promise<number> => {
  try {
    const params: any = {};
    if (idbodega !== undefined && idbodega !== null && idbodega > 0) params.idbodega = idbodega;
    const response = await api.get<{ count: number }>("/inventory/inventory/low-margin-count", { params });
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

export const getSucursales = async (): Promise<SucursalOption[]> => {
  try {
    const response = await api.get<SucursalOption[]>("/inventory/sucursales");
    return response.data;
  } catch (error) {
    console.error("Error fetching sucursales:", error);
    return [];
  }
};