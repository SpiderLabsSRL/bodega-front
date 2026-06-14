import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Camera,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  searchProducts,
  getCashStatus,
  processSale,
  type Product,
  type SaleRequest,
} from "@/api/SalesApi";
import { getUserId, getCurrentUser } from "@/api/AuthApi";
import BarcodeScanner from "./BarcodeScanner";
import { Textarea } from "../ui/textarea";

interface SaleItem extends Product {
  cantidad: number;
  ubicacion?: string;
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

export function VenderView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [ventaItems, setVentaItems] = useState<SaleItem[]>([]);
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "QR">("Efectivo");
  const [montoPagado, setMontoPagado] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(false);
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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cartRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);
  const barcodeBufferRef = useRef<string>("");
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef<boolean>(false); // Para controlar si estamos en medio de un escaneo

  const currentUser = getCurrentUser();
  const username = currentUser?.nombres || "Usuario";
  const userId = getUserId();

  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  useEffect(() => {
    loadCashStatus();
  }, []);

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

  // Cargar productos similares cuando se expande un producto
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

  // Manejar historial del navegador para el escáner
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

  const openScanner = () => {
    setShowScanner(true);
    window.history.pushState({ scanner: true }, '');
  };

  // Función para verificar si un producto ya está en el carrito y su cantidad
  const getCantidadEnCarrito = (productId: number): number => {
    const item = ventaItems.find(item => item.idproducto === productId);
    return item ? item.cantidad : 0;
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    
    try {
      setLoading(true);
      isScanningRef.current = true;
      
      // Limpiar el buscador y mostrar el nuevo código escaneado
      setSearchQuery(barcode);
      setSearchResults([]);
      setExpandedProduct(null);
      setSimilarProductsData(new Map());
      lastSearchQueryRef.current = barcode;
      
      const results = await searchProducts(barcode);
      
      if (results.length > 0) {
        const product = results[0];
        const cantidadEnCarrito = getCantidadEnCarrito(product.idproducto);
        const stockDisponible = product.stock - cantidadEnCarrito;
        
        // Mostrar resultados en el buscador
        setSearchResults(results);
        
        // Si hay stock disponible, agregar automáticamente al carrito
        if (stockDisponible > 0) {
          // Agregar solo 1 unidad por escaneo
          agregarProductoUnidad(product);
          toast({
            title: "Producto agregado",
            description: `${product.nombre} agregado al carrito. Stock restante: ${stockDisponible - 1}`,
            duration: 2000,
          });
        } else {
          // Si no hay stock disponible, mostrar mensaje y expandir similares
          toast({
            title: "Stock agotado",
            description: `${product.nombre} no tiene más stock disponible. Mostrando productos similares...`,
            variant: "destructive",
            duration: 3000,
          });
          
          // Expandir automáticamente para mostrar similares
          setExpandedProduct(product.idproducto);
          
          // Cargar productos similares
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
      // Resetear el flag después de un breve momento
      setTimeout(() => {
        isScanningRef.current = false;
      }, 100);
    }
  };

  // Nueva función para agregar SOLO UNA unidad por escaneo
  const agregarProductoUnidad = (product: Product) => {
    const existingIndex = ventaItems.findIndex(
      (item) => item.idproducto === product.idproducto,
    );

    if (existingIndex !== -1) {
      // Producto ya existe, verificar stock
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
      // Producto nuevo
      if (product.stock > 0) {
        const nuevoItem: SaleItem = {
          ...product,
          cantidad: 1,
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
      for (const similar of similares) {
        try {
          const results = await searchProducts(similar.nombre);
          const found = results.find(
            (p) => p.idproducto === similar.idproducto,
          );
          if (found) {
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

        // Buscar y agregar automáticamente el producto escaneado
        handleBarcodeScanned(barcode);
      }
      return;
    }

    // Detectar caracteres (para código de barras)
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

  const loadCashStatus = async () => {
    try {
      const status = await getCashStatus();
      setCajaAbierta(status.estado === "abierta");
    } catch (error) {
      console.error("Error loading cash status:", error);
      setCajaAbierta(false);
    }
  };

  const performSearch = async (query: string) => {
    if (isSearchingRef.current) return;

    isSearchingRef.current = true;
    setLoading(true);

    try {
      const results = await searchProducts(query);
      setSearchResults(results);
      setSimilarProductsData(new Map());
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // No hacer nada especial, permitir que el evento normal fluya
  };

  const toggleProductExpansion = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  // Función original para agregar producto (para los botones)
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
        const nuevoItem: SaleItem = {
          ...product,
          cantidad: 1,
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

  const procesarVenta = async () => {
    if (!cajaAbierta) {
      toast({
        title: "Caja Cerrada",
        description: "No se puede procesar la venta. La caja está cerrada.",
        variant: "destructive",
      });
      return;
    }

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
        description: "Proporcione una razon para el descuento",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description:
          "No se encontró información del usuario. Por favor, inicie sesión nuevamente.",
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
        descripcion:
          descripcion.length > 200
            ? descripcion.substring(0, 200) + "..."
            : descripcion,
        sub_total: subtotal,
        descuento: descuento,
        descripcion_descuento: discountReason,
        total: total,
        metodo_pago: metodoPago,
        items: items,
      };

      await processSale(saleRequest, userId);

      setVentaItems([]);
      setDescuento(0);
      setMontoPagado(0);
      setShowConfirm(false);
      setDiscountReason('');
      setShowDiscountField(false);

      toast({
        title: "¡Venta procesada!",
        description: `Venta completada por Bs. ${formatBs(total)}`,
      });

      await loadCashStatus();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al procesar la venta",
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
      {/* Escáner de código de barras - solo visible en móvil */}
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
        <div className="mt-2">
          <Badge variant={cajaAbierta ? "default" : "destructive"}>
            Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
          </Badge>
          {currentUser && (
            <Badge variant="outline" className="ml-2">
              {currentUser.rol}
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
              {/* Botón de escáner - SOLO para móvil */}
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
                                {product.nombre_ubicacion}
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

                      {/* Botón de "v" en la parte inferior derecha */}
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
                                <ChevronUp className="h-3 w-3 mr-1" /> Ver menos
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

                      {/* Productos similares */}
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
                                            {similar.nombre_ubicacion}
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
                  <span className="text-sm whitespace-nowrap">
                    -Bs {formatBs(descuento)}
                  </span>
                </div>

                {showDiscountField && (
                  <div className="mt-2">
                    <Label htmlFor="discountReason">Justificación del descuento *</Label>
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
              <RadioGroup
                value={metodoPago}
                onValueChange={(value: "Efectivo" | "QR") =>
                  setMetodoPago(value)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Efectivo" id="efectivo" />
                  <Label htmlFor="efectivo">Efectivo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="QR" id="qr" />
                  <Label htmlFor="qr">QR</Label>
                </div>
              </RadioGroup>

              {metodoPago === "Efectivo" && (
                <div className="space-y-2">
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

              {metodoPago === "QR" && (
                <div className="text-center">
                  <div className="w-64 h-64 bg-white rounded-lg mx-auto flex items-center justify-center border-2 border-primary/20">
                    <img
                      src="/qr.jpg"
                      alt="Código QR para pago"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Escanea el código QR para pagar
                  </p>
                </div>
              )}
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={
                    ventaItems.length === 0 ||
                    !cajaAbierta ||
                    tieneItemsInvalidos
                  }
                >
                  {!cajaAbierta
                    ? "Caja Cerrada"
                    : tieneItemsInvalidos
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