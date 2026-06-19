import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para las tablas maestras
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
  ubicacion_nombre: string;
  idubicacion: number;
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
  idubicacion: number;
  ubicacion_nombre: string;
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

export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  idubicacion: number;
  categorias: number[];
  imagen?: File | string | null;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo?: number;
  codigo_barras?: string | null;
  productos_similares?: number[];
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

export const getUbicaciones = async (): Promise<BackendUbicacion[]> => {
  try {
    const idbodega = getUserBodega();
    const url = idbodega ? `/ubicaciones?bodega=${idbodega}` : "/ubicaciones";
    const response = await api.get<BackendUbicacion[]>(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const getCategorias = async (): Promise<BackendCategoria[]> => {
  try {
    const response = await api.get<BackendCategoria[]>("/categorias");
    return response.data;
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

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

// Obtener todos los productos (filtrados por bodega)
export const getAllProductos = async (): Promise<Producto[]> => {
  try {
    const idbodega = getUserBodega();
    const url = idbodega ? `/todos?bodega=${idbodega}` : "/todos";
    const response = await api.get<BackendProducto[]>(url);
    return response.data.map(mapBackendProducto);
  } catch (error) {
    console.error("Error fetching todos los productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

// Función original getProductos
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

export const getProductoById = async (id: number): Promise<Producto> => {
  try {
    const idbodega = getUserBodega();
    const url = idbodega ? `/productos/${id}?bodega=${idbodega}` : `/productos/${id}`;
    const response = await api.get<BackendProducto>(url);
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error fetching producto:", error);
    throw new Error("No se pudo cargar el producto");
  }
};

export const createProducto = async (formData: FormData): Promise<Producto> => {
  try {
    const idbodega = getUserBodega();
    if (idbodega) {
      formData.append("idbodega", idbodega.toString());
    }

    const response = await api.post<BackendProducto>("/productos", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error creating producto:", error);
    throw new Error("No se pudo crear el producto");
  }
};

export const updateProducto = async (
  id: number,
  formData: FormData,
): Promise<Producto> => {
  try {
    const idbodega = getUserBodega();
    if (idbodega) {
      formData.append("idbodega", idbodega.toString());
    }

    const response = await api.put<BackendProducto>(
      `/productos/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating producto:", error);
    throw new Error("No se pudo actualizar el producto");
  }
};

export const deleteProducto = async (id: number): Promise<void> => {
  try {
    await api.delete(`/productos/${id}`);
  } catch (error) {
    console.error("Error deleting producto:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

export const updateStockProducto = async (
  idproducto: number,
  cantidad: number,
): Promise<Producto> => {
  try {
    const idbodega = getUserBodega();
    const url = idbodega 
      ? `/productos/${idproducto}/stock?bodega=${idbodega}`
      : `/productos/${idproducto}/stock`;
    
    const response = await api.patch<BackendProducto>(
      url,
      {
        cantidad,
      },
    );
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

// Mapeadores
function mapBackendProducto(producto: BackendProducto): Producto {
  return {
    idproducto: producto.idproducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    idubicacion: producto.idubicacion,
    ubicacion: producto.ubicacion_nombre || "Sin ubicación",
    estado: producto.estado,
    categorias: producto.categorias,
    ubicacion_nombre: producto.ubicacion_nombre,
    imagen: producto.imagen,
    precio_venta: producto.precio_venta,
    precio_compra: producto.precio_compra,
    stock: producto.stock,
    stock_minimo: producto.stock_minimo,
    codigo_barras: producto.codigo_barras,
    productos_similares: producto.productos_similares || [],
  };
}