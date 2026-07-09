import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  // Ya no hay idubicacion directo
  imagen: string;
  precio_venta: string;
  stock: number;
  ubicaciones?: Array<{
    idubicacion: number;
    nombre_ubicacion: string;
  }>; // Array de ubicaciones donde está disponible
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

export interface Product {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  imagen: string;
  precio_venta: number;
  stock: number;
  ubicaciones?: Array<{
    idubicacion: number;
    nombre_ubicacion: string;
  }>;
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

export interface SaleItem {
  idproducto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
}

export interface SaleRequest {
  descripcion: string;
  sub_total: number;
  descuento: number;
  total: number;
  metodo_pago: "Efectivo" | "QR";
  descripcion_descuento: string;
  items: SaleItem[];
  userId?: number;
  idcliente?: number | null;
  idbodega?: number | null;
}

export interface ClienteSearchResult {
  id: number;
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota: string;
  estado: boolean;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Función para obtener el ID de bodega del usuario
const getUserBodega = (): number | null => {
  try {
    const bodegaId = localStorage.getItem("userBodega");
    return bodegaId ? parseInt(bodegaId) : null;
  } catch (error) {
    console.error("Error getting user bodega:", error);
    return null;
  }
};

export const searchProducts = async (
  query: string,
  withoutStock: boolean = true,
): Promise<Product[]> => {
  try {
    const idbodega = getUserBodega();
    let url = `/sales/products/search?q=${encodeURIComponent(query)}&withoutStock=${encodeURIComponent(withoutStock)}`;
    if (idbodega) {
      url += `&bodega=${idbodega}`;
    }
    
    const response = await api.get<BackendProduct[]>(url);
    return response.data.map(mapBackendProduct);
  } catch (error) {
    console.error("Error searching products:", error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 500) {
        console.error("Server error details:", error.response.data);
        throw new Error(
          "Error del servidor al buscar productos. Por favor, intente nuevamente.",
        );
      }
    }

    throw new Error("No se pudieron buscar los productos");
  }
};

export const searchClientes = async (query: string): Promise<ClienteSearchResult[]> => {
  try {
    console.log("🔍 searchClientes called with query:", query);
    
    if (!query || query.trim().length < 2) {
      console.log("⚠️ Query too short, returning empty");
      return [];
    }
    
    const url = `/sales/clientes/search?q=${encodeURIComponent(query.trim())}`;
    console.log("📡 Calling URL:", url);
    
    const response = await api.get<ClienteSearchResult[]>(url);
    console.log("✅ Response data:", response.data);
    
    return response.data;
  } catch (error) {
    console.error("❌ Error searching clients:", error);
    if (axios.isAxiosError(error)) {
      console.error("❌ Error response:", error.response?.data);
    }
    throw new Error("No se pudieron buscar los clientes");
  }
};

export const processSale = async (
  sale: SaleRequest,
  userId: number,
): Promise<{ idventa: number }> => {
  try {
    const idbodega = getUserBodega();
    console.log("📦 ID Bodega para venta:", idbodega);
    
    if (!idbodega) {
      throw new Error("No se pudo determinar la bodega del usuario");
    }
    
    const saleWithUser = {
      ...sale,
      userId: userId,
      idbodega: idbodega,
    };

    console.log("📤 Enviando venta:", saleWithUser);
    
    const response = await api.post<{ idventa: number }>(
      "/sales/process",
      saleWithUser,
    );
    return response.data;
  } catch (error) {
    console.error("Error processing sale:", error);
    throw new Error("No se pudo procesar la venta");
  }
};

export function mapBackendProduct(product: BackendProduct): Product {
  // Obtener el nombre de la primera ubicación si existe, o un valor por defecto
  const ubicacionNombre = product.ubicaciones && product.ubicaciones.length > 0 
    ? product.ubicaciones[0].nombre_ubicacion 
    : "Sin ubicación";
  
  return {
    idproducto: product.idproducto,
    nombre: product.nombre,
    descripcion: product.descripcion,
    estado: product.estado,
    imagen: product.imagen,
    precio_venta: parseFloat(product.precio_venta),
    stock: product.stock,
    ubicaciones: product.ubicaciones || [],
    productos_similares: product.productos_similares || [],
  };
}