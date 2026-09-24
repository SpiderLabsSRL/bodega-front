import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// INTERFACES DEL BACKEND
// ============================================

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
  tiene_imagen?: boolean;
  imagen: string | null;
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

// ============================================
// INTERFACES PÚBLICAS
// ============================================

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
  tiene_imagen: boolean;
  imagen: string | null; // URL completa lista para <img src>
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

// ============================================
// CLIENTE AXIOS OPTIMIZADO
// ============================================

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// ============================================
// HELPERS
// ============================================

/**
 * Construye la URL completa de la imagen del producto.
 * El backend devuelve `/api/productos/:id/imagen` y aquí lo convertimos
 * en URL absoluta para que <img src="..."> funcione.
 */
export const getImageUrl = (
  imagen: string | null | undefined,
  idproducto?: number,
): string => {
  const FALLBACK =
    "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";

  if (!imagen) {
    if (idproducto) {
      return `${API_URL}/productos/${idproducto}/imagen`;
    }
    return FALLBACK;
  }

  // Si ya es una URL absoluta (http/https o data:)
  if (imagen.startsWith("http") || imagen.startsWith("data:")) {
    return imagen;
  }

  // Si es una ruta relativa del backend (/api/productos/...)
  if (imagen.startsWith("/api/")) {
    // Quitar /api del inicio porque API_URL ya incluye /api
    return `${API_URL}${imagen.replace(/^\/api/, "")}`;
  }

  // Si es una ruta relativa normal
  if (imagen.startsWith("/")) {
    return `${API_URL}${imagen}`;
  }

  // Fallback: base64 sin prefijo (compatibilidad con backend antiguo)
  return `data:image/jpeg;base64,${imagen}`;
};

/**
 * Obtener el ID de bodega del usuario desde localStorage
 */
const getUserBodega = (): number | null => {
  try {
    const bodegaId = localStorage.getItem("userBodega");
    return bodegaId ? parseInt(bodegaId) : null;
  } catch (error) {
    return null;
  }
};

// ============================================
// CACHÉ EN MEMORIA (opcional, mejora UX)
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 segundos
let todosProductosCache: CacheEntry<Producto[]> | null = null;
let categoriasCache: CacheEntry<BackendCategoria[]> | null = null;
let ubicacionesCache: CacheEntry<BackendUbicacion[]> | null = null;

const isCacheValid = <T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

export const invalidateProductosCache = () => {
  todosProductosCache = null;
};

export const invalidateAllCache = () => {
  todosProductosCache = null;
  categoriasCache = null;
  ubicacionesCache = null;
};

// ============================================
// MAPEADOR
// ============================================

function mapBackendProducto(producto: BackendProducto): Producto {
  const ubicaciones = producto.ubicaciones || [];
  const ubicacionNombre =
    ubicaciones.length > 0 ? ubicaciones[0].nombre : "Sin ubicación";

  // El backend devuelve `imagen` como URL relativa `/api/productos/:id/imagen`
  // o null. La convertimos a URL absoluta.
  let imagenUrl: string | null = null;
  if (producto.imagen) {
    imagenUrl = getImageUrl(producto.imagen, producto.idproducto);
  } else if (producto.tiene_imagen) {
    imagenUrl = `${API_URL}/productos/${producto.idproducto}/imagen`;
  }

  return {
    idproducto: producto.idproducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    ubicaciones: ubicaciones,
    ubicacion: ubicacionNombre,
    estado: producto.estado,
    categorias: producto.categorias || [],
    tiene_imagen: !!producto.tiene_imagen,
    imagen: imagenUrl,
    precio_venta: producto.precio_venta,
    precio_compra: producto.precio_compra,
    stock: producto.stock || 0,
    stock_minimo: producto.stock_minimo || 0,
    codigo_barras: producto.codigo_barras,
    productos_similares: producto.productos_similares || [],
  };
}

// ============================================
// API: UBICACIONES
// ============================================

export const getUbicaciones = async (): Promise<BackendUbicacion[]> => {
  const idbodega = getUserBodega();

  if (isCacheValid(ubicacionesCache)) {
    return ubicacionesCache.data;
  }

  try {
    const url = idbodega ? `/ubicaciones?bodega=${idbodega}` : "/ubicaciones";
    const response = await api.get<BackendUbicacion[]>(url);
    ubicacionesCache = { data: response.data, timestamp: Date.now() };
    return response.data;
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

// ============================================
// API: CATEGORÍAS
// ============================================

export const getCategorias = async (): Promise<BackendCategoria[]> => {
  if (isCacheValid(categoriasCache)) {
    return categoriasCache.data;
  }

  try {
    const response = await api.get<BackendCategoria[]>("/categorias");
    categoriasCache = { data: response.data, timestamp: Date.now() };
    return response.data;
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

// ============================================
// API: PRODUCTOS PARA SELECT
// ============================================

export const getTodosProductosParaSelect = async (): Promise<
  { idproducto: number; nombre: string }[]
> => {
  try {
    const idbodega = getUserBodega();
    const url = idbodega ? `/todos-select?bodega=${idbodega}` : "/todos-select";
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching productos para select:", error);
    return [];
  }
};

// ============================================
// API: BUSCAR PRODUCTOS
// ============================================

export const buscarProductos = async (termino: string): Promise<Producto[]> => {
  try {
    if (!termino || termino.trim().length < 2) {
      return [];
    }

    const idbodega = getUserBodega();
    const url = idbodega
      ? `/buscar?termino=${encodeURIComponent(termino.trim())}&bodega=${idbodega}`
      : `/buscar?termino=${encodeURIComponent(termino.trim())}`;

    const response = await api.get<BackendProducto[]>(url);
    return response.data.map(mapBackendProducto);
  } catch (error) {
    console.error("Error buscando productos:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

// ============================================
// API: TODOS LOS PRODUCTOS (con caché)
// ============================================

export const getAllProductos = async (
  skipCache = false,
): Promise<Producto[]> => {
  if (!skipCache && isCacheValid(todosProductosCache)) {
    return todosProductosCache.data;
  }

  try {
    const idbodega = getUserBodega();
    const url = idbodega ? `/todos?bodega=${idbodega}` : "/todos";
    const response = await api.get<BackendProducto[]>(url);
    const mapped = response.data.map(mapBackendProducto);
    todosProductosCache = { data: mapped, timestamp: Date.now() };
    return mapped;
  } catch (error) {
    console.error("Error fetching todos los productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

// ============================================
// API: PRODUCTOS (compatibilidad)
// ============================================

export const getProductos = async (
  searchTerm?: string,
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

// ============================================
// API: PRODUCTO POR ID
// ============================================

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

// ============================================
// API: ELIMINAR PRODUCTO
// ============================================

export const deleteProducto = async (id: number): Promise<void> => {
  try {
    await api.delete(`/productos/${id}`);
    invalidateAllCache();
  } catch (error) {
    console.error("Error deleting producto:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

// ============================================
// API: ACTUALIZAR STOCK
// ============================================

export const updateStockProducto = async (
  idproducto: number,
  cantidad: number,
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
      },
    );

    invalidateProductosCache();

    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

// ============================================
// API: URL DIRECTA DE IMAGEN (para <img src>)
// ============================================

/**
 * Devuelve la URL de la imagen del producto.
 * Úsalo en <img src={getProductoImagenUrl(id)} />
 * El navegador la cachea automáticamente.
 */
export const getProductoImagenUrl = (idproducto: number): string => {
  return `${API_URL}/productos/${idproducto}/imagen`;
};