// src/api/EcommerceViewApi.ts - VERSIÓN FINAL COMPLETA
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendCarrusel {
  idcarrusel: number;
  nombre: string;
  estado: number;
}

interface BackendCarruselProducto {
  idcarrusel: number;
  idproducto: number;
}

interface BackendProducto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  idubicacion: number;
  estado: number;
  precio_venta: string;
  precio_compra: string;
  stock: number;
  stock_minimo: number;
  imagen: string;
}

export interface Carrusel {
  id: string;
  name: string;
  productIds: string[];
  estado: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image: string;
}

export interface CarruselRequest {
  nombre: string;
  productIds: number[];
}

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

const productCache = new Map<string, Product>();

// Función segura para obtener datos de API
const safeApiGet = async <T>(url: string, defaultValue: T): Promise<T> => {
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.warn(`Endpoint no encontrado: ${url}`);
    }
    return defaultValue;
  }
};

// Crear producto básico rápido
const createBasicProduct = (backendProducto: BackendProducto): Product => {
  return {
    id: backendProducto.idproducto.toString(),
    name: backendProducto.nombre,
    description: backendProducto.descripcion || "",
    category: "Cargando...",
    price: 0,
    stock: 0,
    image: ''
  };
};

// Obtener productos básicos desde el endpoint /ecommerce/productos
const getProductosBasicos = async (): Promise<BackendProducto[]> => {
  try {
    const response = await api.get<BackendProducto[]>("/ecommerce/productos");
    return response.data.filter(producto => producto.estado === 0);
  } catch (error: any) {
    console.error("Error fetching basic products:", error.message);
    return [];
  }
};

// Obtener categorías de un producto
const getCategoriasProducto = async (productId: string): Promise<string[]> => {
  try {
    return await safeApiGet<string[]>(
      `/ecommerce/productos/${productId}/categorias`,
      []
    );
  } catch (error) {
    return [];
  }
};

// Construir producto completo usando datos disponibles
const buildProductFromAvailableData = async (
  productId: string,
  basicInfo?: BackendProducto
): Promise<Product> => {
  // Verificar cache primero
  if (productCache.has(productId)) {
    return productCache.get(productId)!;
  }
  
  try {
    let productoBasico = basicInfo;
    if (!productoBasico) {
      const productos = await getProductosBasicos();
      productoBasico = productos.find(p => p.idproducto.toString() === productId);
    }
    
    if (!productoBasico) {
      // Crear producto mínimo
      const minimalProduct: Product = {
        id: productId,
        name: "Producto no encontrado",
        description: "",
        category: "No disponible",
        price: 0,
        stock: 0,
        image: '',
      };
      productCache.set(productId, minimalProduct);
      return minimalProduct;
    }
    
    const [
      categorias
    ] = await Promise.all([
      getCategoriasProducto(productId)
    ]);
    
    let image: string = '';
    if (productoBasico) {
      image = productoBasico.imagen;
    }
        
    // Calcular valores
    const categoria = categorias.length > 0 ? categorias[0] : "Sin categoría";
    const price = productoBasico.precio_venta ? Number(productoBasico.precio_venta) : 0;
    const stock = productoBasico.stock ? productoBasico.stock : 0;
    
    const fullProduct: Product = {
      id: productoBasico.idproducto.toString(),
      name: productoBasico.nombre,
      description: productoBasico.descripcion || "",
      category: categoria,
      price: price,
      stock: stock,
      image: image
    };
    
    // Guardar en cache
    productCache.set(productId, fullProduct);
    
    return fullProduct;
  } catch (error) {
    console.error(`Error construyendo producto ${productId}:`, error);
    
    // Producto de emergencia
    const emergencyProduct: Product = {
      id: productId,
      name: "Error al cargar",
      description: "",
      category: "Error",
      price: 0,
      stock: 0,
      image: ''
    };
    
    productCache.set(productId, emergencyProduct);
    return emergencyProduct;
  }
};

// Obtener todos los carruseles
export const getCarruseles = async (): Promise<Carrusel[]> => {
  try {
    const response = await api.get<BackendCarrusel[]>("/ecommerce/carruseles");
    const carruseles = await Promise.all(
      response.data
        .filter(carrusel => carrusel.estado === 0)
        .map(async (carrusel) => {
          try {
            const productosResponse = await safeApiGet<BackendCarruselProducto[]>(
              `/ecommerce/carruseles/${carrusel.idcarrusel}/productos`,
              []
            );
            
            const productIds = productosResponse.map(v => v.idproducto.toString());
            
            return {
              id: carrusel.idcarrusel.toString(),
              name: carrusel.nombre,
              productIds: productIds,
              estado: carrusel.estado
            };
          } catch (error) {
            return {
              id: carrusel.idcarrusel.toString(),
              name: carrusel.nombre,
              productIds: [],
              estado: carrusel.estado
            };
          }
        })
    );
    return carruseles;
  } catch (error: any) {
    console.error("Error fetching carruseles:", error.message);
    throw new Error("No se pudieron cargar los carruseles");
  }
};

// Obtener todos los productos disponibles
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const productosActivos = await getProductosBasicos();
    
    // Crear productos básicos inmediatamente
    const productosBasicos = productosActivos.map(createBasicProduct);
    
    // Enriquecer productos en segundo plano
    setTimeout(async () => {
      const primerosProductos = productosActivos.slice(0, Math.min(10, productosActivos.length));
      
      for (const producto of primerosProductos) {
        try {
          await buildProductFromAvailableData(producto.idproducto.toString(), producto);
        } catch (error) {
          // Continuar con siguiente producto
        }
      }
    }, 500);
    
    return productosBasicos;
  } catch (error: any) {
    console.error("Error fetching products:", error.message);
    return [];
  }
};

// Buscar productos
export const searchProducts = async (searchTerm: string): Promise<Product[]> => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  
  try {
    // Primero buscar productos básicos
    const response = await api.get<BackendProducto[]>(
      `/ecommerce/productos/search?q=${encodeURIComponent(searchTerm)}`
    );
    
    const productosActivos = response.data.filter(producto => producto.estado === 0);
    const productosLimitados = productosActivos.slice(0, 20);
    
    // Construir productos completos para los resultados
    const productosEnriquecidos = await Promise.all(
      productosLimitados.map(async (producto) => {
        try {
          return await buildProductFromAvailableData(producto.idproducto.toString(), producto);
        } catch (error) {
          return createBasicProduct(producto);
        }
      })
    );
    
    return productosEnriquecidos;
  } catch (error: any) {
    console.error("Error searching products:", error.message);
    return [];
  }
};

// Obtener productos completos para un carrusel
export const getFullProductsForCarousel = async (productIds: string[]): Promise<Product[]> => {
  if (!productIds || productIds.length === 0) {
    return [];
  }
  
  try {
    // Primero obtener todos los productos básicos
    const productosBasicos = await getProductosBasicos();
    
    const productosCompletos = await Promise.all(
      productIds.map(async (id) => {
        try {
          // Buscar en cache primero
          if (productCache.has(id)) {
            return productCache.get(id)!;
          }
          
          // Buscar en productos básicos
          const productoBasico = productosBasicos.find(p => p.idproducto.toString() === id);
          
          if (productoBasico) {
            // Construir producto completo
            return await buildProductFromAvailableData(id, productoBasico);
          } else {
            // Producto no encontrado en la lista básica
            const notFoundProduct: Product = {
              id: id,
              name: "Producto no encontrado",
              description: "",
              category: "No disponible",
              price: 0,
              stock: 0,
              image: ''
            };
            return notFoundProduct;
          }
        } catch (error) {
          console.error(`Error obteniendo producto ${id}:`, error);
          const errorProduct: Product = {
            id: id,
            name: "Error al cargar",
            description: "",
            category: "Error",
            price: 0,
            stock: 0,
            image: ''
          };
          return errorProduct;
        }
      })
    );
    
    return productosCompletos;
  } catch (error) {
    console.error("Error obteniendo productos para carrusel:", error);
    return [];
  }
};

// Funciones para carruseles
export const createCarrusel = async (carrusel: CarruselRequest): Promise<Carrusel> => {
  try {
    const response = await api.post<BackendCarrusel>("/ecommerce/carruseles", {
      nombre: carrusel.nombre
    });
    
    if (carrusel.productIds && carrusel.productIds.length > 0) {
      try {
        await api.post(`/ecommerce/carruseles/${response.data.idcarrusel}/productos`, {
          productos: carrusel.productIds
        });
      } catch (error: any) {
        console.error("Error adding products to carousel:", error.message);
      }
    }
    
    const productosResponse = await safeApiGet<BackendCarruselProducto[]>(
      `/ecommerce/carruseles/${response.data.idcarrusel}/productos`,
      []
    );
    
    const productIds = productosResponse.map(v => v.idproducto.toString());
    
    return {
      id: response.data.idcarrusel.toString(),
      name: response.data.nombre,
      productIds: productIds,
      estado: response.data.estado
    };
  } catch (error: any) {
    console.error("Error creating carrusel:", error.message);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "Datos inválidos para crear el carrusel");
    }
    
    throw new Error("No se pudo crear el carrusel");
  }
};

export const updateCarrusel = async (id: string, carrusel: CarruselRequest): Promise<Carrusel> => {
  try {
    const response = await api.put<BackendCarrusel>(`/ecommerce/carruseles/${id}`, {
      nombre: carrusel.nombre
    });
    
    if (carrusel.productIds && carrusel.productIds.length >= 0) {
      try {
        await api.put(`/ecommerce/carruseles/${id}/productos`, {
          productos: carrusel.productIds
        });
      } catch (error: any) {
        console.error("Error updating products in carousel:", error.message);
      }
    }
    
    const productosResponse = await safeApiGet<BackendCarruselProducto[]>(
      `/ecommerce/carruseles/${id}/productos`,
      []
    );
    
    const productIds = productosResponse.map(v => v.idproducto.toString());
    
    return {
      id: response.data.idcarrusel.toString(),
      name: response.data.nombre,
      productIds: productIds,
      estado: response.data.estado
    };
  } catch (error: any) {
    console.error("Error updating carrusel:", error.message);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "Datos inválidos para actualizar el carrusel");
    }
    
    if (error.response?.status === 404) {
      throw new Error("Carrusel no encontrado");
    }
    
    throw new Error("No se pudo actualizar el carrusel");
  }
};

export const deleteCarrusel = async (id: string): Promise<void> => {
  try {
    await api.delete(`/ecommerce/carruseles/${id}`);
  } catch (error: any) {
    console.error("Error deleting carrusel:", error.message);
    
    if (error.response?.status === 404) {
      throw new Error("Carrusel no encontrado");
    }
    
    throw new Error("No se pudo eliminar el carrusel");
  }
};

// Función auxiliar para obtener información de productos seleccionados
export const getSelectedProductsInfo = async (productIds: string[]): Promise<Product[]> => {
  // Esta función reemplaza a getFullProductsBatch y evita el endpoint /productos/{id} que no existe
  return getFullProductsForCarousel(productIds);
};