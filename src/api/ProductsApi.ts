import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendUbicacion {
  idubicacion: number;
  nombre: string;
  estado: number;
  idbodega: number | null;
}

interface BackendCategoria {
  idcategoria: number;
  nombre: string;
  estado: number;
}

interface BackendProducto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  ubicaciones: Array<{
    idubicacion: number;
    nombre: string;
    idbodega: number;
  }>;
  categorias: string[];
  imagen: string;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo: number;
  codigo_barras: string | null;
  productos_similares: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

export interface Producto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  ubicaciones: Array<{
    idubicacion: number;
    nombre: string;
    idbodega: number;
  }>;
  ubicacion: string;
  categorias: string[];
  estado: number;
  imagen: string;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo: number;
  codigo_barras: string | null;
  productos_similares: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  // Timeout más generoso para producción
  timeout: 30000,
});

// ============================================
// CACHE EN MEMORIA PARA PETICIONES
// ============================================
const memCache = new Map<string, { data: any; ts: number }>();
const MEM_TTL = 30 * 1000; // 30 segundos

function getMemCache<T>(key: string): T | null {
  const item = memCache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > MEM_TTL) {
    memCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setMemCache(key: string, data: any) {
  memCache.set(key, { data, ts: Date.now() });
}

export function clearProductsCache() {
  memCache.clear();
}

const getUserBodega = (): number | null => {
  try {
    const bodegaId = localStorage.getItem("userBodega");
    return bodegaId ? parseInt(bodegaId) : null;
  } catch (error) {
    console.error("Error getting user bodega:", error);
    return null;
  }
};

export const getUbicaciones = async (): Promise<BackendUbicacion[]> => {
  const idbodega = getUserBodega();
  const cacheKey = `ubicaciones:${idbodega || "all"}`;

  const cached = getMemCache<BackendUbicacion[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = idbodega
      ? `/ubicaciones?bodega=${idbodega}`
      : "/ubicaciones";
    const response = await api.get<BackendUbicacion[]>(url);
    setMemCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const getCategorias = async (): Promise<BackendCategoria[]> => {
  const cacheKey = "categorias:all";
  const cached = getMemCache<BackendCategoria[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await api.get<BackendCategoria[]>("/categorias");
    setMemCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

export const getTodosProductosParaSelect = async (): Promise<
  { idproducto: number; nombre: string }[]
> => {
  const idbodega = getUserBodega();
  const cacheKey = `todos-select:${idbodega || "all"}`;

  const cached =
    getMemCache<{ idproducto: number; nombre: string }[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = idbodega
      ? `/todos-select?bodega=${idbodega}`
      : "/todos-select";
    const response = await api.get(url);
    setMemCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching productos para select:", error);
    return [];
  }
};

export const buscarProductos = async (
  termino: string
): Promise<Producto[]> => {
  if (!termino || termino.trim().length < 2) {
    return [];
  }

  const idbodega = getUserBodega();
  const cacheKey = `buscar:${termino.trim()}:${idbodega || "all"}`;

  const cached = getMemCache<Producto[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = idbodega
      ? `/buscar?termino=${encodeURIComponent(
          termino.trim()
        )}&bodega=${idbodega}`
      : `/buscar?termino=${encodeURIComponent(termino.trim())}`;

    const response = await api.get<BackendProducto[]>(url);
    const mapped = response.data.map(mapBackendProducto);
    setMemCache(cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.error("Error buscando productos:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

export const getAllProductos = async (): Promise<Producto[]> => {
  const idbodega = getUserBodega();
  const cacheKey = `todos:${idbodega || "all"}`;

  const cached = getMemCache<Producto[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = idbodega ? `/todos?bodega=${idbodega}` : "/todos";
    const response = await api.get<BackendProducto[]>(url);
    const mapped = response.data.map(mapBackendProducto);
    setMemCache(cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.error("Error fetching todos los productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

export const getProductos = async (
  searchTerm?: string
): Promise<Producto[]> => {
  try {
    if (searchTerm && searchTerm.trim().length >= 2) {
      return buscarProductos(searchTerm);
    }
    return getAllProductos();
  } catch (error) {
    console.error("Error fetching productos:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const getProductoById = async (id: number): Promise<Producto> => {
  try {
    const idbodega = getUserBodega();
    const url = idbodega
      ? `/productos/${id}?bodega=${idbodega}`
      : `/productos/${id}`;
    const response = await api.get<BackendProducto>(url);
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error fetching producto:", error);
    throw new Error("No se pudo cargar el producto");
  }
};

export const deleteProducto = async (id: number): Promise<void> => {
  try {
    await api.delete(`/productos/${id}`);
    clearProductsCache();
  } catch (error) {
    console.error("Error deleting producto:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

export const updateStockProducto = async (
  idproducto: number,
  cantidad: number
): Promise<Producto> => {
  try {
    const idbodega = getUserBodega();
    if (!idbodega) {
      throw new Error("No se pudo obtener la bodega del usuario");
    }

    const response = await api.patch<BackendProducto>(
      `/productos/${idproducto}/stock`,
      {
        cantidad,
        idbodega,
      }
    );

    clearProductsCache();
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

function mapBackendProducto(producto: BackendProducto): Producto {
  const ubicaciones = producto.ubicaciones || [];
  const ubicacionNombre =
    ubicaciones.length > 0 ? ubicaciones[0].nombre : "Sin ubicación";

  return {
    idproducto: producto.idproducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    ubicaciones: ubicaciones,
    ubicacion: ubicacionNombre,
    estado: producto.estado,
    categorias: producto.categorias || [],
    imagen: producto.imagen,
    precio_venta: producto.precio_venta,
    precio_compra: producto.precio_compra,
    stock: producto.stock || 0,
    stock_minimo: producto.stock_minimo || 0,
    codigo_barras: producto.codigo_barras,
    productos_similares: producto.productos_similares || [],
  };
}