import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Camera,
  User,
  UserPlus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  searchProducts,
  searchClientes,
  processSale,
  type Product,
  type SaleRequest,
  type ClienteSearchResult,
} from "@/api/SalesApi";
import { getUserId, getCurrentUser, getUserBodega } from "@/api/AuthApi";
import { createCliente } from "@/api/clientesApi";
import BarcodeScanner from "./BarcodeScanner";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";

interface SaleItem extends Product {
  cantidad: number;
  ubicacion?: string;
}

interface ClienteFormData {
  nombres: string;
  apellidos: string;
  carnet: string;
  celular: string;
  nota: string;
}

interface BodegaInfo {
  id: number;
  nombre: string;
}

const formatBs = (value: number) => {
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return v.toFixed(2);
};

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const getImageUrl = (imagen: any): string | null => {
  if (!imagen) return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';

  if (typeof imagen === "string") {
    if (imagen.startsWith("http") || imagen.startsWith("data:image")) {
      return imagen;
    }
    if (imagen.length > 0 && !imagen.includes("object")) {
      return `data:image/jpeg;base64,${imagen}`;
    }
    return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
  }

  if (imagen && imagen.data && Array.isArray(imagen.data)) {
    try {
      const uint8Array = new Uint8Array(imagen.data);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.error("Error converting image buffer:", e);
      return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
    }
  }

  if (
    imagen &&
    typeof imagen === "object" &&
    imagen.type === "Buffer" &&
    Array.isArray(imagen.data)
  ) {
    try {
      const uint8Array = new Uint8Array(imagen.data);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.error("Error converting Buffer:", e);
      return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
    }
  }

  return 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
};

// Función para obtener ubicaciones para mostrar
const getUbicacionDisplay = (product: Product): string => {
  if (product.ubicaciones && product.ubicaciones.length > 0) {
    return product.ubicaciones.map(u => u.nombre_ubicacion).join(", ");
  }
  return "Sin ubicación";
};

export function VenderView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [ventaItems, setVentaItems] = useState<SaleItem[]>([]);
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "QR">("Efectivo");
  const [montoPagado, setMontoPagado] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [similarProductsData, setSimilarProductsData] = useState<
    Map<number, Product[]>
  >(new Map());
  const [loadingSimilars, setLoadingSimilars] = useState<Map<number, boolean>>(
    new Map(),
  );
  const [showDiscountField, setShowDiscountField] = useState(false);
  const [discountReason, setDiscountReason] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteSearchResult | null>(null);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteFormData, setClienteFormData] = useState<ClienteFormData>({
    nombres: "",
    apellidos: "",
    carnet: "",
    celular: "",
    nota: "",
  });
  const [submittingCliente, setSubmittingCliente] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");
  const [clienteSearchResults, setClienteSearchResults] = useState<ClienteSearchResult[]>([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [showClienteNota, setShowClienteNota] = useState(false);
  const [bodegaInfo, setBodegaInfo] = useState<BodegaInfo | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cartRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);
  const barcodeBufferRef = useRef<string>("");
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  const currentUser = getCurrentUser();
  const username = currentUser?.nombres || "Usuario";
  const userId = getUserId();
  const userBodegaId = getUserBodega();

  // Obtener información de la bodega del usuario
  useEffect(() => {
    const fetchBodegaInfo = async () => {
      if (!userBodegaId) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/bodegas/${userBodegaId}`);
        if (response.ok) {
          const data = await response.json();
          setBodegaInfo({
            id: data.idbodega,
            nombre: data.nombre
          });
        } else {
          setBodegaInfo({
            id: userBodegaId,
            nombre: `Bodega ${userBodegaId}`
          });
        }
      } catch (error) {
        console.error("Error fetching bodega info:", error);
        setBodegaInfo({
          id: userBodegaId,
          nombre: `Bodega ${userBodegaId}`
        });
      }
    };

    fetchBodegaInfo();
  }, [userBodegaId]);

  console.log("👤 Usuario actual:", { userId, userBodegaId, username, bodegaInfo });

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedClienteSearch = useDebounce(clienteSearchTerm, 500);

  useEffect(() => {
    if (
      debouncedSearchQuery.trim().length >= 2 &&
      debouncedSearchQuery !== lastSearchQueryRef.current
    ) {
      lastSearchQueryRef.current = debouncedSearchQuery;
      performSearch(debouncedSearchQuery);
    } else if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([]);
      setExpandedProduct(null);
      setSimilarProductsData(new Map());
      lastSearchQueryRef.current = "";
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (expandedProduct !== null) {
      const product = searchResults.find(
        (p) => p.idproducto === expandedProduct,
      );
      if (
        product &&
        product.productos_similares &&
        product.productos_similares.length > 0
      ) {
        loadSimilarProducts(expandedProduct, product.productos_similares);
      }
    }
  }, [expandedProduct, searchResults]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (showScanner) {
        event.preventDefault();
        setShowScanner(false);
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showScanner]);

  // Buscar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (debouncedClienteSearch.trim().length >= 2) {
      searchClientesBackend(debouncedClienteSearch);
    } else {
      setClienteSearchResults([]);
    }
  }, [debouncedClienteSearch]);

  const searchClientesBackend = async (term: string) => {
    try {
      setSearchingClientes(true);
      const results = await searchClientes(term);
      setClienteSearchResults(results);
    } catch (error) {
      console.error("Error searching clients:", error);
      setClienteSearchResults([]);
    } finally {
      setSearchingClientes(false);
    }
  };

  const openScanner = () => {
    setShowScanner(true);
    window.history.pushState({ scanner: true }, '');
  };

  const getCantidadEnCarrito = (productId: number): number => {
    const item = ventaItems.find(item => item.idproducto === productId);
    return item ? item.cantidad : 0;
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    
    try {
      setLoading(true);
      isScanningRef.current = true;
      
      setSearchQuery(barcode);
      setSearchResults([]);
      setExpandedProduct(null);
      setSimilarProductsData(new Map());
      lastSearchQueryRef.current = barcode;
      
      const results = await searchProducts(barcode);
      
      if (results.length > 0) {
        const uniqueResults = filterUniqueProducts(results);
        const product = uniqueResults[0];
        const cantidadEnCarrito = getCantidadEnCarrito(product.idproducto);
        const stockRestante = product.stock - cantidadEnCarrito;
        
        setSearchResults(uniqueResults);
        
        if (stockRestante > 0) {
          agregarProductoUnidad(product);
          toast({
            title: "Producto agregado",
            description: `${product.nombre} agregado al carrito. Stock restante: ${stockRestante - 1}`,
            duration: 2000,
          });
        } else {
          toast({
            title: "Stock agotado",
            description: `${product.nombre} no tiene más stock disponible. Mostrando productos similares...`,
            variant: "destructive",
            duration: 3000,
          });
          
          setExpandedProduct(product.idproducto);
          
          if (product.productos_similares && product.productos_similares.length > 0) {
            await loadSimilarProducts(product.idproducto, product.productos_similares);
          }
        }
      } else {
        setSearchResults([]);
        toast({
          title: "Producto no encontrado",
          description: `No se encontró producto con código: ${barcode}`,
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error en escaneo:", error);
      toast({
        title: "Error",
        description: "Error al buscar el producto escaneado",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isScanningRef.current = false;
      }, 100);
    }
  };

  const filterUniqueProducts = (products: Product[]): Product[] => {
    const seen = new Set<number>();
    return products.filter(product => {
      if (seen.has(product.idproducto)) {
        return false;
      }
      seen.add(product.idproducto);
      return true;
    });
  };

  const agregarProductoUnidad = (product: Product) => {
    const existingIndex = ventaItems.findIndex(
      (item) => item.idproducto === product.idproducto,
    );

    if (existingIndex !== -1) {
      const item = ventaItems[existingIndex];
      if (item.cantidad < product.stock) {
        const newItems = [...ventaItems];
        newItems[existingIndex].cantidad += 1;
        setVentaItems(newItems);
      } else {
        toast({
          title: "Stock insuficiente",
          description: `No hay más stock disponible para ${product.nombre}`,
          variant: "destructive",
        });
      }
    } else {
      if (product.stock > 0) {
        const ubicacionDisplay = getUbicacionDisplay(product);
        const nuevoItem: SaleItem = {
          ...product,
          cantidad: 1,
          ubicacion: ubicacionDisplay,
        };
        setVentaItems([...ventaItems, nuevoItem]);
      } else {
        toast({
          title: "Sin stock",
          description: `${product.nombre} no tiene stock disponible`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDiscountChange = (discountValue: number) => {
    if (discountValue > 0) {
      setShowDiscountField(true);
    } else {
      setShowDiscountField(false);
      setDiscountReason('');
    }
    setDescuento(discountValue);
  };

  const loadSimilarProducts = async (
    productId: number,
    similares: Array<{ idproducto: number; nombre: string }>,
  ) => {
    if (similarProductsData.has(productId)) return;

    setLoadingSimilars((prev) => new Map(prev).set(productId, true));

    try {
      const similarProducts: Product[] = [];
      const seen = new Set<number>();
      
      for (const similar of similares) {
        try {
          const results = await searchProducts(similar.nombre);
          const found = results.find(
            (p) => p.idproducto === similar.idproducto,
          );
          if (found && !seen.has(found.idproducto)) {
            seen.add(found.idproducto);
            similarProducts.push(found);
          }
        } catch (error) {
          console.error(
            `Error loading similar product ${similar.idproducto}:`,
            error,
          );
        }
      }

      setSimilarProductsData((prev) =>
        new Map(prev).set(productId, similarProducts),
      );
    } catch (error) {
      console.error("Error loading similar products:", error);
    } finally {
      setLoadingSimilars((prev) => new Map(prev).set(productId, false));
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (event.key === "Enter") {
      if (barcodeBufferRef.current.length > 0) {
        event.preventDefault();
        const barcode = barcodeBufferRef.current;
        barcodeBufferRef.current = "";

        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
          barcodeTimeoutRef.current = null;
        }

        handleBarcodeScanned(barcode);
      }
      return;
    }

    if (event.key.length === 1 && !isScanningRef.current) {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      barcodeBufferRef.current += event.key;

      barcodeTimeoutRef.current = setTimeout(() => {
        barcodeBufferRef.current = "";
        barcodeTimeoutRef.current = null;
      }, 100);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [ventaItems]);

  const performSearch = async (query: string) => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    if (isSearchingRef.current) return;

    isSearchingRef.current = true;
    setLoading(true);

    try {
      const results = await searchProducts(query);
      
      if (abortController.signal.aborted) {
        return;
      }
      
      const uniqueResults = filterUniqueProducts(results);
      setSearchResults(uniqueResults);
      setSimilarProductsData(new Map());

      setTimeout(() => {
        if (searchInputRef.current && !abortController.signal.aborted) {
          const currentPosition = searchInputRef.current.selectionStart;
          searchInputRef.current.focus();
          if (currentPosition !== null) {
            searchInputRef.current.setSelectionRange(currentPosition, currentPosition);
          }
        }
      }, 10);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error("Error searching products:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
      if (searchAbortControllerRef.current === abortController) {
        searchAbortControllerRef.current = null;
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchInputRef.current) {
      const currentPosition = e.target.selectionStart;
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (currentPosition !== null) {
            searchInputRef.current.setSelectionRange(currentPosition, currentPosition);
          }
        }
      }, 0);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const toggleProductExpansion = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const agregarProducto = (product: Product) => {
    const existingIndex = ventaItems.findIndex(
      (item) => item.idproducto === product.idproducto,
    );

    if (existingIndex !== -1) {
      const newItems = [...ventaItems];
      if (newItems[existingIndex].cantidad < product.stock) {
        newItems[existingIndex].cantidad += 1;
        setVentaItems(newItems);
      } else {
        toast({
          title: "Stock insuficiente",
          description: `No hay suficiente stock para ${product.nombre}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      if (product.stock > 0) {
        const ubicacionDisplay = getUbicacionDisplay(product);
        const nuevoItem: SaleItem = {
          ...product,
          cantidad: 1,
          ubicacion: ubicacionDisplay,
        };
        setVentaItems([...ventaItems, nuevoItem]);
      } else {
        toast({
          title: "Sin stock",
          description: `${product.nombre} no tiene stock disponible`,
          variant: "destructive",
        });
        return;
      }
    }

    setSearchQuery("");
    setSearchResults([]);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 50);
  };

  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) {
      eliminarItem(index);
      return;
    }

    const item = ventaItems[index];
    if (nuevaCantidad > item.stock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.stock} unidades disponibles`,
        variant: "destructive",
      });
      return;
    }

    const newItems = [...ventaItems];
    newItems[index].cantidad = nuevaCantidad;
    setVentaItems(newItems);
  };

  const handleCantidadInputChange = (index: number, value: string) => {
    if (value === "") {
      const newItems = [...ventaItems];
      newItems[index].cantidad = 0;
      setVentaItems(newItems);
      return;
    }

    const numericValue = parseInt(value);
    if (isNaN(numericValue) || numericValue < 1) {
      return;
    }

    const item = ventaItems[index];
    if (numericValue > item.stock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.stock} unidades disponibles`,
        variant: "destructive",
      });
      return;
    }

    const newItems = [...ventaItems];
    newItems[index].cantidad = numericValue;
    setVentaItems(newItems);
  };

  const handleCantidadInputBlur = (index: number, value: string) => {
    if (value === "" || parseInt(value) === 0) {
      const newItems = [...ventaItems];
      newItems[index].cantidad = 1;
      setVentaItems(newItems);
    }
  };

  const eliminarItem = (index: number) => {
    const newItems = ventaItems.filter((_, i) => i !== index);
    setVentaItems(newItems);
  };

  const subtotal = ventaItems.reduce(
    (total, item) => total + item.precio_venta * item.cantidad,
    0,
  );
  const total = Math.max(0, subtotal - descuento);
  const cambio =
    metodoPago === "Efectivo" ? Math.max(0, montoPagado - total) : 0;

  const tieneItemsInvalidos = ventaItems.some((item) => item.cantidad < 1);

  const validateClienteForm = (): boolean => {
    if (!clienteFormData.nombres.trim()) {
      toast({ title: "Error", description: "Los nombres son obligatorios", variant: "destructive" });
      return false;
    }
    if (!clienteFormData.apellidos.trim()) {
      toast({ title: "Error", description: "Los apellidos son obligatorios", variant: "destructive" });
      return false;
    }
    if (!clienteFormData.carnet.trim()) {
      toast({ title: "Error", description: "El carnet es obligatorio", variant: "destructive" });
      return false;
    }
    if (clienteFormData.carnet.trim().length < 5 || clienteFormData.carnet.trim().length > 13) {
      toast({ title: "Error", description: "El carnet debe tener entre 5 y 13 caracteres", variant: "destructive" });
      return false;
    }
    if (!clienteFormData.celular.trim()) {
      toast({ title: "Error", description: "El celular es obligatorio", variant: "destructive" });
      return false;
    }
    const celularRegex = /^[0-9+]{6,12}$/;
    if (!celularRegex.test(clienteFormData.celular.trim())) {
      toast({ title: "Error", description: "El celular debe tener entre 6 y 12 caracteres (solo números y el signo +)", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleCreateCliente = async () => {
    if (!validateClienteForm()) return;

    try {
      setSubmittingCliente(true);
      const newCliente = await createCliente({
        nombres: clienteFormData.nombres.trim(),
        apellidos: clienteFormData.apellidos.trim(),
        carnet: clienteFormData.carnet.trim(),
        celular: clienteFormData.celular.trim(),
        nota: clienteFormData.nota.trim() || undefined,
      });
      
      const newClienteResult: ClienteSearchResult = {
        id: newCliente.id,
        nombres: newCliente.nombres,
        apellidos: newCliente.apellidos,
        carnet: newCliente.carnet,
        celular: newCliente.celular,
        nota: newCliente.nota,
        estado: newCliente.estado,
      };
      
      setSelectedCliente(newClienteResult);
      setShowClienteForm(false);
      setClienteFormData({
        nombres: "",
        apellidos: "",
        carnet: "",
        celular: "",
        nota: "",
      });
      setClienteSearchTerm("");
      setClienteSearchResults([]);
      
      toast({
        title: "Cliente creado",
        description: `${newCliente.nombres} ${newCliente.apellidos} ha sido agregado.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el cliente",
        variant: "destructive",
      });
    } finally {
      setSubmittingCliente(false);
    }
  };

  const clearSelectedCliente = () => {
    setSelectedCliente(null);
    setClienteSearchTerm("");
    setClienteSearchResults([]);
    setShowClienteNota(false);
  };

  const toggleClienteNota = () => {
    setShowClienteNota(!showClienteNota);
  };

  const procesarVenta = async () => {
    if (ventaItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto",
        variant: "destructive",
      });
      return;
    }

    if (tieneItemsInvalidos) {
      toast({
        title: "Error",
        description: "Todos los productos deben tener al menos 1 unidad",
        variant: "destructive",
      });
      return;
    }

    if (metodoPago === "Efectivo" && montoPagado > 0 && montoPagado < total) {
      toast({
        title: "Error",
        description: "El monto pagado es insuficiente",
        variant: "destructive",
      });
      return;
    }

    if (descuento > 0 && !discountReason.trim()) {
      toast({
        title: "Error",
        description: "Proporcione una razón para el descuento",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "No se encontró información del usuario. Por favor, inicie sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    if (!userBodegaId) {
      toast({
        title: "Error",
        description: "No se encontró la bodega del usuario. Por favor, inicie sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const descripcion = ventaItems
        .map(
          (item) =>
            `${item.cantidad} ${item.nombre} - Bs ${formatBs(item.precio_venta)}`,
        )
        .join(", ");

      const items = ventaItems.map((item) => ({
        idproducto: item.idproducto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        subtotal_linea: item.precio_venta * item.cantidad,
      }));

      const saleRequest: SaleRequest = {
        descripcion: descripcion.length > 200 ? descripcion.substring(0, 200) + "..." : descripcion,
        sub_total: subtotal,
        descuento: descuento,
        descripcion_descuento: discountReason,
        total: total,
        metodo_pago: metodoPago,
        items: items,
        idcliente: selectedCliente?.id || null,
        idbodega: userBodegaId,
      };

      console.log("📤 Enviando venta:", saleRequest);

      await processSale(saleRequest, userId);

      setVentaItems([]);
      setDescuento(0);
      setMontoPagado(0);
      setShowConfirm(false);
      setDiscountReason('');
      setShowDiscountField(false);
      setSelectedCliente(null);
      setShowClienteNota(false);

      toast({
        title: "¡Venta procesada!",
        description: `Venta completada por Bs. ${formatBs(total)}`,
      });

    } catch (error) {
      console.error("❌ Error en procesarVenta:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la venta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Escáner de código de barras */}
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            window.history.back();
          }}
        />
      )}

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              ¡Bienvenido, {username}!
            </h2>
            <p className="text-muted-foreground">
              Sistema TRAXION
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Fecha</p>
            <p className="font-medium">{currentDate}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {currentUser && (
            <Badge variant="outline">
              {currentUser.rol}
            </Badge>
          )}
          {bodegaInfo && (
            <Badge variant="secondary">
              {bodegaInfo.nombre}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Buscar Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nombre o código de barras"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-10"
                disabled={loading}
                autoFocus={true}
              />
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openScanner}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>

            {loading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Buscando productos...</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((product) => {
                  const hasSimilares =
                    product.productos_similares &&
                    product.productos_similares.length > 0;
                  const isExpanded = expandedProduct === product.idproducto;
                  const similarProducts =
                    similarProductsData.get(product.idproducto) || [];
                  const isLoadingSimilars =
                    loadingSimilars.get(product.idproducto) || false;
                  const cantidadEnCarrito = getCantidadEnCarrito(product.idproducto);
                  const stockRestante = product.stock - cantidadEnCarrito;
                  const ubicacionesDisplay = getUbicacionDisplay(product);

                  return (
                    <div
                      key={product.idproducto}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {(() => {
                            const imageUrl = getImageUrl(product.imagen);
                            return imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.nombre}
                                className="w-16 h-16 rounded-md object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  Sin imagen
                                </span>
                              </div>
                            );
                          })()}
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-semibold text-sm ${isMobile ? "break-words" : ""}`}
                            >
                              {product.nombre}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {product.descripcion}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {ubicacionesDisplay}
                              </Badge>
                              {cantidadEnCarrito > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  En carrito: {cantidadEnCarrito} | Stock disponible: {stockRestante}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium">
                              Bs {formatBs(product.precio_venta)} | Stock total:{" "}
                              {product.stock}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            agregarProducto(product);
                          }}
                          disabled={stockRestante === 0}
                          className="ml-2 flex-shrink-0"
                        >
                          {stockRestante === 0 ? "Sin Stock" : "Agregar"}
                        </Button>
                      </div>

                      {hasSimilares && (
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleProductExpansion(product.idproducto)
                            }
                            className="h-7 px-2 text-xs"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" /> Ver menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" /> Ver
                                similares ({product.productos_similares!.length}
                                )
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {hasSimilares && isExpanded && (
                        <div className="pl-4 border-l-2 border-primary/30 space-y-2 mt-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Productos similares:
                          </p>
                          {isLoadingSimilars ? (
                            <div className="text-center py-4">
                              <p className="text-xs text-muted-foreground">
                                Cargando productos similares...
                              </p>
                            </div>
                          ) : similarProducts.length > 0 ? (
                            similarProducts.map((similar) => {
                              const cantSimilarEnCarrito = getCantidadEnCarrito(similar.idproducto);
                              const stockRestanteSimilar = similar.stock - cantSimilarEnCarrito;
                              const ubicacionesSimilar = getUbicacionDisplay(similar);
                              return (
                                <div
                                  key={similar.idproducto}
                                  className="bg-muted/30 rounded-lg p-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      {(() => {
                                        const imageUrl = getImageUrl(
                                          similar.imagen,
                                        );
                                        return imageUrl ? (
                                          <img
                                            src={imageUrl}
                                            alt={similar.nombre}
                                            className="w-12 h-12 rounded-md object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display =
                                                "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">
                                              Sin img
                                            </span>
                                          </div>
                                        );
                                      })()}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {similar.nombre}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                          {similar.descripcion?.substring(0, 60)}
                                          ...
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {ubicacionesSimilar}
                                          </Badge>
                                        </div>
                                        <p className="text-xs font-medium mt-1">
                                          Bs {formatBs(similar.precio_venta)} |
                                          Stock: {similar.stock}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        agregarProducto(similar);
                                      }}
                                      disabled={stockRestanteSimilar === 0}
                                      className="ml-2 flex-shrink-0 h-8"
                                    >
                                      {stockRestanteSimilar === 0
                                        ? "Sin Stock"
                                        : "Agregar"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-xs text-muted-foreground">
                                No se pudieron cargar los productos similares
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading &&
              searchQuery.length >= 2 &&
              searchResults.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    No se encontraron productos
                  </p>
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" ref={cartRef}>
          <CardHeader>
            <CardTitle>Detalle de Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de Cliente con búsqueda */}
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Buscar cliente por nombre, carnet o celular..."
                    value={clienteSearchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setClienteSearchTerm(value);
                      
                      if (value.trim().length >= 2) {
                        searchClientesBackend(value.trim());
                      } else {
                        setClienteSearchResults([]);
                      }
                    }}
                    className="pr-10"
                  />
                  {searchingClientes && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClienteForm(true)}
                  className="h-10 px-3 flex-shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                {selectedCliente && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelectedCliente}
                    className="h-10 px-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Resultados de búsqueda */}
              {clienteSearchResults.length > 0 && (
                <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto shadow-lg bg-white">
                  {clienteSearchResults.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="p-3 hover:bg-primary/10 cursor-pointer border-b last:border-b-0 flex items-center justify-between transition-colors"
                      onClick={() => {
                        setSelectedCliente(cliente);
                        setClienteSearchTerm("");
                        setClienteSearchResults([]);
                        setShowClienteNota(false);
                      }}
                    >
                      <div>
                        <span className="font-medium">
                          {cliente.nombres} {cliente.apellidos}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {cliente.carnet}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {cliente.celular}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Mensaje de "No se encontraron clientes" */}
              {clienteSearchTerm.trim().length >= 2 && 
               clienteSearchResults.length === 0 && 
               !searchingClientes && (
                <div className="text-center py-3 text-sm text-muted-foreground border rounded-md bg-muted/20">
                  No se encontraron clientes
                </div>
              )}

              {/* Mensaje de "Buscando..." */}
              {clienteSearchTerm.trim().length >= 2 && 
               clienteSearchResults.length === 0 && 
               searchingClientes && (
                <div className="text-center py-3 text-sm text-muted-foreground border rounded-md bg-muted/20">
                  Buscando clientes...
                </div>
              )}

              {/* Cliente seleccionado con botón de "ojito" */}
              {selectedCliente && (
                <div className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium truncate">
                        {selectedCliente.nombres} {selectedCliente.apellidos}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">- {selectedCliente.carnet}</span>
                      <span className="text-muted-foreground flex-shrink-0">- {selectedCliente.celular}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={toggleClienteNota}
                            className="h-7 w-7 p-0 flex-shrink-0"
                          >
                            {showClienteNota ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{showClienteNota ? "Ocultar nota" : "Ver nota"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* Mostrar nota si está visible y existe */}
                  {showClienteNota && (
                    <div className="mt-2 pt-2 border-t border-primary/10">
                      <p className="text-xs text-muted-foreground font-medium">Nota:</p>
                      <p className="text-sm mt-0.5 break-words whitespace-pre-wrap">
                        {selectedCliente.nota && selectedCliente.nota.trim() ? (
                          selectedCliente.nota
                        ) : (
                          <span className="text-muted-foreground italic">Sin nota</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dialog para crear cliente */}
            <Dialog open={showClienteForm} onOpenChange={setShowClienteForm}>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombres">
                      Nombre(s) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombres"
                      placeholder="Ej: María"
                      value={clienteFormData.nombres}
                      onChange={(e) => setClienteFormData({...clienteFormData, nombres: e.target.value})}
                      disabled={submittingCliente}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellidos">
                      Apellido(s) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="apellidos"
                      placeholder="Ej: González Ramírez"
                      value={clienteFormData.apellidos}
                      onChange={(e) => setClienteFormData({...clienteFormData, apellidos: e.target.value})}
                      disabled={submittingCliente}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carnet">
                      Carnet <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="carnet"
                      placeholder="Ej: 1234567"
                      value={clienteFormData.carnet}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 13) {
                          setClienteFormData({...clienteFormData, carnet: value});
                        }
                      }}
                      maxLength={13}
                      disabled={submittingCliente}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="celular">
                      Celular <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="celular"
                      placeholder="Ej: 72123456"
                      value={clienteFormData.celular}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9+]/g, "");
                        if (value.length <= 12) {
                          setClienteFormData({...clienteFormData, celular: value});
                        }
                      }}
                      maxLength={12}
                      disabled={submittingCliente}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nota">Nota</Label>
                    <Input
                      id="nota"
                      placeholder="Observaciones adicionales..."
                      value={clienteFormData.nota}
                      onChange={(e) => setClienteFormData({...clienteFormData, nota: e.target.value})}
                      disabled={submittingCliente}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowClienteForm(false)} disabled={submittingCliente}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCliente} disabled={submittingCliente}>
                    {submittingCliente ? "Creando..." : "Crear Cliente"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {ventaItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay productos agregados
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {ventaItems.map((item, index) => (
                  <div
                    key={item.idproducto}
                    className="border rounded-lg p-3 bg-card"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {(() => {
                        const imageUrl = getImageUrl(item.imagen);
                        return imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.nombre}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              Sin img
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm break-words whitespace-normal leading-tight">
                          {item.nombre}
                        </h5>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          Bs {formatBs(item.precio_venta)} c/u
                        </p>
                        {item.ubicacion && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ubicación: {item.ubicacion}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            actualizarCantidad(index, item.cantidad - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.cantidad === 0 ? "" : item.cantidad}
                          onChange={(e) =>
                            handleCantidadInputChange(index, e.target.value)
                          }
                          onBlur={(e) =>
                            handleCantidadInputBlur(index, e.target.value)
                          }
                          className="w-12 h-8 text-center text-sm font-medium number-input-no-scroll"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            actualizarCantidad(index, item.cantidad + 1)
                          }
                          disabled={item.cantidad >= item.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold whitespace-nowrap">
                          Bs {formatBs(item.precio_venta * item.cantidad)}
                        </p>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => eliminarItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Bs {formatBs(subtotal)}</span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor="descuento" className="text-sm whitespace-nowrap">
                    Descuento (Bs):
                  </Label>
                  <Input
                    id="descuento"
                    type="number"
                    min="0"
                    step="0.01"
                    value={descuento || ""}
                    onChange={(e) => handleDiscountChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 h-8 number-input-no-scroll"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>

                {showDiscountField && (
                  <div className="mt-2">
                    <Label htmlFor="discountReason">
                      Justificación del descuento <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="discountReason"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="Explique el motivo del descuento..."
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>Bs {formatBs(total)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Método de Pago:</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={metodoPago === "Efectivo" ? "default" : "outline"}
                  onClick={() => setMetodoPago("Efectivo")}
                  className={cn(
                    "h-12 text-base font-medium transition-all",
                    metodoPago === "Efectivo" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "hover:bg-muted"
                  )}
                >
                  Efectivo
                </Button>
                <Button
                  type="button"
                  variant={metodoPago === "QR" ? "default" : "outline"}
                  onClick={() => setMetodoPago("QR")}
                  className={cn(
                    "h-12 text-base font-medium transition-all",
                    metodoPago === "QR" 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "hover:bg-muted"
                  )}
                >
                  QR
                </Button>
              </div>

              {metodoPago === "Efectivo" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="montoPagado">
                    Monto Pagado (opcional para calcular cambio):
                  </Label>
                  <Input
                    id="montoPagado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoPagado || ""}
                    onChange={(e) =>
                      setMontoPagado(Number(e.target.value) || 0)
                    }
                    placeholder="Ingrese el monto pagado"
                    className="number-input-no-scroll"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {montoPagado > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">
                        Cambio: Bs {formatBs(cambio)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={
                    ventaItems.length === 0 ||
                    tieneItemsInvalidos
                  }
                >
                  {tieneItemsInvalidos
                    ? "Cantidades inválidas"
                    : "Procesar Venta"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Venta</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de procesar esta venta por Bs {formatBs(total)}
                    ?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={procesarVenta} disabled={loading}>
                    {loading ? "Procesando..." : "Confirmar Venta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}