// src/api/BodegaApi.ts
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

interface BackendBodega {
  idbodega: number;
  nombre: string;
  tipo: string;
  direccion: string;
  telefono: string;
  estado: number;
}

interface BackendProductoBodega {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  ubicacion_nombre: string;
  categorias: string[];
  imagen: any;
  precio_venta: string;
  precio_compra: string;
  codigo_barras: string | null;
  stock: number;
  stock_minimo: number;
  idbodega: number;
  bodega_nombre: string;
  bodegas_stock?: Array<{
    idbodega: number;
    bodega_nombre: string;
    stock: number;
    stock_minimo: number;
  }>;
}

export interface ProductoBodega {
  id: number;
  nombre: string;
  codigo: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  ubicacion: string;
  precio: number;
  precio_compra?: number;
  proveedor: string;
  imagen?: string;
  idbodega?: number;
  bodega_nombre?: string;
  descripcion?: string;
  estado?: number;
  bodegas_stock?: Array<{
    idbodega: number;
    bodega_nombre: string;
    stock: number;
    stock_minimo: number;
  }>;
}

export interface Sucursal {
  id: number;
  nombre: string;
  ubicacion: string;
  tipo?: string;
  direccion?: string;
  telefono?: string;
  estado?: number;
}

export interface BodegaRequest {
  nombre: string;
  tipo: string;
  direccion?: string;
  telefono?: string;
}

export interface TransferenciaRequest {
  idproducto: number;
  idbodegaOrigen?: number;
  idbodegaDestino: number;
  cantidad: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getBodegas = async (): Promise<BackendBodega[]> => {
  try {
    const response = await api.get<BackendBodega[]>("/bodegas");
    return response.data;
  } catch (error) {
    console.error("Error fetching bodegas:", error);
    throw new Error("No se pudieron cargar las bodegas");
  }
};

export const getBodegasActivas = async (): Promise<BackendBodega[]> => {
  try {
    const response = await api.get<BackendBodega[]>("/bodegas/activas");
    return response.data;
  } catch (error) {
    console.error("Error fetching bodegas activas:", error);
    throw new Error("No se pudieron cargar las bodegas activas");
  }
};

export const createBodega = async (data: BodegaRequest): Promise<BackendBodega> => {
  try {
    const response = await api.post<BackendBodega>("/bodegas", data);
    return response.data;
  } catch (error) {
    console.error("Error creating bodega:", error);
    throw new Error("No se pudo crear la bodega");
  }
};

export const getUbicaciones = async (idbodega?: number): Promise<BackendUbicacion[]> => {
  try {
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

export const getProductosByBodega = async (idbodega: number): Promise<ProductoBodega[]> => {
  try {
    const response = await api.get<BackendProductoBodega[]>(`/bodegas/${idbodega}/productos`);
    return response.data.map(mapBackendProductoBodega);
  } catch (error) {
    console.error("Error fetching productos por bodega:", error);
    throw new Error("No se pudieron cargar los productos de la bodega");
  }
};

export const getAllProductosBodega = async (): Promise<ProductoBodega[]> => {
  try {
    const response = await api.get<BackendProductoBodega[]>("/bodegas/productos/todos");
    return response.data.map(mapBackendProductoBodega);
  } catch (error) {
    console.error("Error fetching all productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

export const getTodosProductosParaSelect = async (): Promise<Array<{ idproducto: number; nombre: string }>> => {
  try {
    const response = await api.get<BackendProductoBodega[]>("/bodegas/productos/todos");
    return response.data.map(p => ({
      idproducto: p.idproducto,
      nombre: p.nombre
    }));
  } catch (error) {
    console.error("Error fetching productos para select:", error);
    return [];
  }
};

export const createProductoBodega = async (formData: FormData): Promise<ProductoBodega> => {
  try {
    const response = await api.post<BackendProductoBodega>("/bodegas/productos", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return mapBackendProductoBodega(response.data);
  } catch (error) {
    console.error("Error creating producto:", error);
    throw new Error("No se pudo crear el producto");
  }
};

export const updateProductoBodega = async (
  id: number,
  formData: FormData
): Promise<ProductoBodega> => {
  try {
    const response = await api.put<BackendProductoBodega>(`/bodegas/productos/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return mapBackendProductoBodega(response.data);
  } catch (error) {
    console.error("Error updating producto:", error);
    throw new Error("No se pudo actualizar el producto");
  }
};

export const deleteProductoBodega = async (id: number): Promise<void> => {
  try {
    await api.delete(`/bodegas/productos/${id}`);
  } catch (error) {
    console.error("Error deleting producto:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

export const transferirProducto = async (data: TransferenciaRequest): Promise<void> => {
  try {
    await api.post("/bodegas/transferir", data);
  } catch (error) {
    console.error("Error transferring producto:", error);
    throw new Error("No se pudo realizar la transferencia");
  }
};

export const buscarProductosBodega = async (termino: string, idbodega?: number): Promise<ProductoBodega[]> => {
  try {
    if (!termino || termino.trim().length < 2) {
      return [];
    }
    let url = `/bodegas/buscar?termino=${encodeURIComponent(termino.trim())}`;
    if (idbodega) url += `&idbodega=${idbodega}`;
    
    const response = await api.get<BackendProductoBodega[]>(url);
    return response.data.map(mapBackendProductoBodega);
  } catch (error) {
    console.error("Error buscando productos:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

// ============================================
// MAPEADOR
// ============================================

function mapBackendProductoBodega(producto: BackendProductoBodega): ProductoBodega {
  let imagenBase64 = undefined;
  
  if (producto.imagen) {
    try {
      if (typeof producto.imagen === 'string') {
        if (producto.imagen.startsWith('data:image')) {
          imagenBase64 = producto.imagen;
        } else if (producto.imagen.startsWith('http')) {
          imagenBase64 = producto.imagen;
        } else {
          try {
            atob(producto.imagen);
            imagenBase64 = `data:image/jpeg;base64,${producto.imagen}`;
          } catch (e) {
            imagenBase64 = producto.imagen;
          }
        }
      } else if (typeof producto.imagen === 'object' && producto.imagen !== null) {
        try {
          if (Array.isArray(producto.imagen)) {
            const byteArray = new Uint8Array(producto.imagen);
            let binary = '';
            for (let i = 0; i < byteArray.length; i++) {
              binary += String.fromCharCode(byteArray[i]);
            }
            imagenBase64 = `data:image/jpeg;base64,${btoa(binary)}`;
          } else if (producto.imagen.data && Array.isArray(producto.imagen.data)) {
            const byteArray = new Uint8Array(producto.imagen.data);
            let binary = '';
            for (let i = 0; i < byteArray.length; i++) {
              binary += String.fromCharCode(byteArray[i]);
            }
            imagenBase64 = `data:image/jpeg;base64,${btoa(binary)}`;
          } else if (producto.imagen.type === 'Buffer' && producto.imagen.data) {
            const byteArray = new Uint8Array(producto.imagen.data);
            let binary = '';
            for (let i = 0; i < byteArray.length; i++) {
              binary += String.fromCharCode(byteArray[i]);
            }
            imagenBase64 = `data:image/jpeg;base64,${btoa(binary)}`;
          }
        } catch (err) {
          console.error('Error al convertir objeto de imagen:', err);
        }
      }
    } catch (error) {
      console.error('Error al procesar imagen:', error);
    }
  }

  let categoria = "Sin categoría";
  if (producto.categorias && producto.categorias.length > 0) {
    categoria = producto.categorias[0];
  }

  return {
    id: producto.idproducto,
    nombre: producto.nombre,
    codigo: producto.codigo_barras || `COD-${producto.idproducto}`,
    categoria: categoria,
    stock: producto.stock || 0,
    stockMinimo: producto.stock_minimo || 0,
    ubicacion: producto.ubicacion_nombre || "Sin ubicación",
    precio: parseFloat(producto.precio_venta) || 0,
    precio_compra: parseFloat(producto.precio_compra) || 0,
    proveedor: "",
    imagen: imagenBase64,
    idbodega: producto.idbodega,
    bodega_nombre: producto.bodega_nombre,
    descripcion: producto.descripcion,
    estado: producto.estado,
    bodegas_stock: producto.bodegas_stock,
  };
}