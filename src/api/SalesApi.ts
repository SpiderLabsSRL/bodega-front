import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  imagen: string;
  precio_venta: string;
  stock: number;
  productos_similares?: Array<{
    idproducto: number;
    nombre: string;
  }>;
}

interface BackendCashStatus {
  idestado_caja: number;
  estado: string;
  monto_inicial: string;
  monto_final: string;
  idusuario: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
}

export interface Product {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  imagen: string;
  precio_venta: number;
  stock: number;
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
}

export interface CashStatus {
  idestado_caja: number;
  estado: "abierta" | "cerrada";
  monto_inicial: number;
  monto_final: number;
  idusuario: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const searchProducts = async (
  query: string,
  withoutStock: boolean = true,
): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProduct[]>(
      `/sales/products/search?q=${encodeURIComponent(query)}&withoutStock=${encodeURIComponent(withoutStock)}`,
    );
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

export const getCashStatus = async (): Promise<CashStatus> => {
  try {
    const response = await api.get<BackendCashStatus>("/sales/cash-status");
    return mapBackendCashStatus(response.data);
  } catch (error) {
    console.error("Error fetching cash status:", error);
    throw new Error("No se pudo obtener el estado de la caja");
  }
};

export const processSale = async (
  sale: SaleRequest,
  userId: number,
): Promise<{ idventa: number }> => {
  try {
    const saleWithUser = {
      ...sale,
      userId: userId,
    };

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
  return {
    idproducto: product.idproducto,
    nombre: product.nombre,
    descripcion: product.descripcion,
    estado: product.estado,
    idubicacion: product.idubicacion,
    nombre_ubicacion: product.nombre_ubicacion,
    imagen: product.imagen,
    precio_venta: parseFloat(product.precio_venta),
    stock: product.stock,
    productos_similares: product.productos_similares || [],
  };
}

function mapBackendCashStatus(cashStatus: BackendCashStatus): CashStatus {
  return {
    idestado_caja: cashStatus.idestado_caja,
    estado: cashStatus.estado as "abierta" | "cerrada",
    monto_inicial: parseFloat(cashStatus.monto_inicial),
    monto_final: parseFloat(cashStatus.monto_final),
    idusuario: cashStatus.idusuario,
    fecha_apertura: cashStatus.fecha_apertura,
    fecha_cierre: cashStatus.fecha_cierre,
  };
}
