import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  categorias: string[];
  precio_venta: string;
  stock: number;
  imagen: string;
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  similar_products?: Array<{
    idproduct: number;
    name: string;
  }>;
}

export interface FilterOptions {
  category: string;
}

export interface Carrusel {
  id: number;
  nombre: string;
  estado: number;
  productos: Product[];
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  }
);

export const getProducts = async (filters?: FilterOptions): Promise<Product[]> => {
  try {
    const params: any = {};
    if (filters) {
      if (filters.category !== "all") params.categoria = filters.category;
    }

    const response = await api.get<BackendProduct[]>("/home/products", { params });

    return response.data.map(mapBackendProduct);
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    console.log("Searching products with query:", query);
    const response = await api.get<BackendProduct[]>(`/home/products/search?q=${encodeURIComponent(query)}`);
    console.log("Search response:", response.data);
    return response.data.map(mapBackendProduct);
  } catch (error) {
    console.error("Error searching products:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

export const getProductCategories = async (): Promise<string[]> => {
  try {
    const response = await api.get<string[]>("/home/products/categories");

    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

export const getCarruseles = async (): Promise<Carrusel[]> => {
  try {
    const response = await api.get<Carrusel[]>("/home/carruseles");
    console.log("Carruseles response:", response.data);
    
    // Mapear los productos dentro de los carruseles
    const carruselesWithMappedProducts = response.data.map(carrusel => ({
      ...carrusel,
      productos: carrusel.productos ? (carrusel.productos as unknown as BackendProduct[]).map(mapBackendProduct) : []
    }));
    
    return carruselesWithMappedProducts;
  } catch (error) {
    console.error("Error fetching carruseles:", error);
    return [];
  }
};

function mapBackendProduct(product: BackendProduct): Product {
  const primaryCategory = product.categorias && product.categorias.length > 0 ? product.categorias[0] : "Sin categoría";

  const image = product.imagen ? 
    product.imagen
    : 
    ['https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png'];
  
  const processedImages = (() => {
    const imageToProcess = Array.isArray(image) ? image[0] : image;
    
    if (imageToProcess.toString().startsWith('data:image')) {
      return imageToProcess;
    }
    if (imageToProcess.toString().startsWith('/9j/') || imageToProcess.length > 1000) {
      return `data:image/jpeg;base64,${imageToProcess}`;
    }
    return imageToProcess;
  })();

  return {
    id: product.idproducto.toString(),
    name: product.nombre,
    description: product.descripcion,
    category: primaryCategory,
    price: parseFloat(product.precio_venta) || 0,
    stock: product.stock || 0,
    image: processedImages
  };
}