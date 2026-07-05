import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getUbicaciones,
  getCategorias,
  getProductos,
  buscarProductos,
  getAllProductos,
  deleteProducto,
  Producto,
  updateStockProducto,
} from "@/api/ProductsApi";
import { getImageUrl } from "./VenderView";

interface StockFormData {
  stockActual: number;
  cantidadAñadir: string;
  productoId: number;
  productoNombre: string;
}

// Componente para el carrusel de imágenes
interface ImageCarouselProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ImageCarousel({
  images,
  productName,
  className = "",
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1,
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
      >
        <Package className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <div className="relative aspect-square w-full">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// Función para renderizar ubicaciones con badges
function RenderUbicaciones({ 
  ubicaciones, 
  bodegaId 
}: { 
  ubicaciones: Array<{ idubicacion: number; nombre: string; idbodega: number }>; 
  bodegaId: number | null;
}) {
  if (!ubicaciones || ubicaciones.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin ubicación</span>;
  }

  // Filtrar ubicaciones por bodega si se especifica
  let ubicacionesFiltradas = ubicaciones;
  if (bodegaId !== null && bodegaId !== undefined) {
    ubicacionesFiltradas = ubicaciones.filter(u => u.idbodega === bodegaId);
  }

  // Si no hay ubicaciones filtradas, mostrar todas
  if (ubicacionesFiltradas.length === 0) {
    ubicacionesFiltradas = ubicaciones;
  }

  // Extraer los nombres
  const nombres = ubicacionesFiltradas.map(u => u.nombre).filter(Boolean);
  
  if (nombres.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin ubicación</span>;
  }

  // Mostrar hasta 2 ubicaciones
  const mostrar = nombres.slice(0, 2);
  const restantes = nombres.length - 2;

  return (
    <div className="flex flex-wrap gap-1">
      {mostrar.map((nombre, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {nombre.length > 12 ? nombre.substring(0, 10) + "..." : nombre}
        </Badge>
      ))}
      {restantes > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{restantes}
        </Badge>
      )}
    </div>
  );
}

// Hook para debounce
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

export function ProductosView() {
  const [isStockFormOpen, setIsStockFormOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [currentStockProduct, setCurrentStockProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searching, setSearching] = useState(false);

  // Estados para las opciones desde la API
  const [ubicaciones, setUbicaciones] = useState<{idubicacion: number; nombre: string}[]>([]);
  const [categorias, setCategorias] = useState<{idcategoria: number; nombre: string}[]>([]);

  const userRole = localStorage.getItem("userRole") || "admin";
  const isAssistant = userRole === "Asistente";

  const [stockFormData, setStockFormData] = useState<StockFormData>({
    stockActual: 0,
    cantidadAñadir: "",
    productoId: 0,
    productoNombre: "",
  });
  const { toast } = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  // Cargar datos básicos (opciones para selects)
  useEffect(() => {
    const loadBasicData = async () => {
      try {
        setLoading(true);
        const [ubicacionesData, categoriasData] = await Promise.all([
          getUbicaciones(),
          getCategorias(),
        ]);

        setUbicaciones(ubicacionesData.map((item) => ({
          idubicacion: item.idubicacion,
          nombre: item.nombre
        })));
        setCategorias(categoriasData.map((item) => ({
          idcategoria: item.idcategoria,
          nombre: item.nombre
        })));
      } catch (error) {
        console.error("Error cargando datos básicos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBasicData();
  }, [toast]);

  // Cargar búsqueda desde inventario si existe
  useEffect(() => {
    const searchFromInventory = sessionStorage.getItem("searchProductName");
    if (searchFromInventory) {
      setSearchTerm(searchFromInventory);
      performSearch(searchFromInventory);
      sessionStorage.removeItem("searchProductName");
    }
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (debouncedSearchTerm.trim().length >= 2) {
      performSearch(debouncedSearchTerm);
    } else if (debouncedSearchTerm.trim().length === 0 && !showAllProducts) {
      setProducts([]);
    }
  }, [debouncedSearchTerm, showAllProducts]);

  // Función para realizar búsqueda
  const performSearch = async (query: string) => {
    setSearching(true);
    try {
      const results = await buscarProductos(query);
      setProducts(results);
    } catch (error) {
      console.error("Error buscando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setSearching(false);
    }
  };

  // Función para cargar todos los productos
  const handleShowAllProducts = async () => {
    const newShowAll = !showAllProducts;
    setShowAllProducts(newShowAll);

    if (newShowAll) {
      setLoadingAll(true);
      try {
        const allProducts = await getAllProductos();
        setProducts(allProducts);
      } catch (error) {
        console.error("Error cargando todos los productos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar todos los productos",
          variant: "destructive",
        });
      } finally {
        setLoadingAll(false);
      }
    } else {
      setProducts([]);
      setSearchTerm("");
    }
  };

  const handleIncreaseStock = (product: Producto) => {
    setCurrentStockProduct(product);
    setStockFormData({
      stockActual: product.stock,
      cantidadAñadir: "",
      productoId: product.idproducto,
      productoNombre: product.nombre,
    });
    setIsStockFormOpen(true);
  };

  const handleStockSubmit = async () => {
    try {
      await updateStockProducto(
        stockFormData.productoId,
        parseInt(stockFormData.cantidadAñadir || "0"),
      );

      const newTotal =
        stockFormData.stockActual +
        parseInt(stockFormData.cantidadAñadir || "0");
      toast({
        title: "Stock actualizado",
        description: `Stock de ${currentStockProduct?.nombre} - ${stockFormData.productoNombre} aumentado a ${newTotal} unidades.`,
      });

      // Recargar productos para actualizar la vista
      if (showAllProducts) {
        const allProducts = await getAllProductos();
        setProducts(allProducts);
      } else if (searchTerm.trim().length >= 2) {
        const results = await buscarProductos(searchTerm);
        setProducts(results);
      }

      setIsStockFormOpen(false);
      setStockFormData({
        stockActual: 0,
        cantidadAñadir: "",
        productoId: 0,
        productoNombre: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el stock",
        variant: "destructive",
      });
    }
  };

  const getTotalStock = (producto: Producto): number => {
    return producto.stock || 0;
  };

  // Obtener el ID de bodega del usuario para filtrar ubicaciones
  const getUserBodegaId = (): number | null => {
    try {
      const bodegaId = localStorage.getItem("userBodega");
      return bodegaId ? parseInt(bodegaId) : null;
    } catch (error) {
      return null;
    }
  };

  const userBodegaId = getUserBodegaId();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando configuraciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          {isAssistant ? "Visualización de Productos" : "Gestión de Productos"}
        </h1>
      </div>

      {/* Dialog para aumentar stock */}
      <Dialog open={isStockFormOpen} onOpenChange={setIsStockFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aumentar Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Producto: {currentStockProduct?.nombre}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Stock actual</div>
              <Input value={stockFormData.stockActual} disabled />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Cantidad a añadir</div>
              <Input
                type="number"
                value={stockFormData.cantidadAñadir}
                onChange={(e) =>
                  setStockFormData((prev) => ({
                    ...prev,
                    cantidadAñadir: e.target.value,
                  }))
                }
                placeholder="0"
                className="number-input-no-scroll"
                onWheel={(e) => e.currentTarget.blur()}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Total después del aumento
              </div>
              <Input
                value={
                  stockFormData.stockActual +
                  parseInt(stockFormData.cantidadAñadir || "0")
                }
                disabled
                className="font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStockSubmit}
              className="bg-primary hover:bg-primary/90"
              disabled={
                !stockFormData.cantidadAñadir ||
                parseInt(stockFormData.cantidadAñadir) <= 0
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>
            {showAllProducts
              ? `Todos los Productos (${products.length})`
              : searchTerm.trim().length >= 2
                ? `Resultados de búsqueda (${products.length})`
                : "Productos"}
          </CardTitle>
          <Button
            variant="outline"
            onClick={handleShowAllProducts}
            className="flex items-center gap-2 w-full md:w-auto"
            disabled={loadingAll}
          >
            {loadingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showAllProducts ? "Ocultar productos" : "Ver todos los productos"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Buscar productos por nombre, categoría, código de barras o tipo... (mín. 2 caracteres)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searching && (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {loadingAll ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">
                Cargando todos los productos...
              </p>
            </div>
          ) : (
            <>
              {(searchTerm.trim().length >= 2 || showAllProducts) &&
                products.length > 0 && (
                  <>
                    {/* Vista móvil y tablet - Cards */}
                    <div className="block xl:hidden space-y-3 w-full">
                      {products.map((product) => {
                        const totalStock = getTotalStock(product);
                        const ubicacionesProducto = product.ubicaciones || [];
                        const ubicacionesNombres = ubicacionesProducto.map(u => u.nombre).filter(Boolean);
                        const ubicacionesMostrar = ubicacionesNombres.slice(0, 2);
                        const ubicacionesRestantes = ubicacionesNombres.length - 2;

                        return (
                          <Card key={product.idproducto} className="p-3 w-full">
                            <div className="space-y-3 w-full">
                              <div className="flex items-start gap-3 w-full">
                                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                                  <ImageCarousel
                                    images={[getImageUrl(product.imagen)]}
                                    productName={product.nombre}
                                    className="w-16 h-16 sm:w-20 sm:h-20"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 break-words">
                                    {product.nombre}
                                  </h3>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {product.categorias
                                      .slice(0, 2)
                                      .map((categoria, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="text-xs px-1.5 py-0.5"
                                        >
                                          {categoria.length > 15
                                            ? categoria.substring(0, 12) + "..."
                                            : categoria}
                                        </Badge>
                                      ))}
                                    {product.categorias.length > 2 && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        +{product.categorias.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                <div className="col-span-2">
                                  <span className="font-medium">Ubicación:</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {ubicacionesMostrar.map((nombre, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0">
                                        {nombre.length > 10 ? nombre.substring(0, 8) + "..." : nombre}
                                      </Badge>
                                    ))}
                                    {ubicacionesRestantes > 0 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                        +{ubicacionesRestantes}
                                      </Badge>
                                    )}
                                    {ubicacionesNombres.length === 0 && (
                                      <span className="text-muted-foreground text-xs">Sin ubicación</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">Stock:</span>
                                  <span className="text-primary ml-1 font-semibold">
                                    {product.stock} u.
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Precio:</span>
                                  <span className="text-primary ml-1 font-semibold">
                                    Bs {Number(product.precio_venta).toFixed(2)}
                                  </span>
                                </div>
                                {product.codigo_barras && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Código:</span>
                                    <span className="text-muted-foreground ml-1 font-mono text-xs break-all">
                                      {product.codigo_barras}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {product.productos_similares &&
                                product.productos_similares.length > 0 && (
                                  <div className="text-xs">
                                    <span className="font-medium">
                                      Similares:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {product.productos_similares
                                        .slice(0, 2)
                                        .map((similar, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {similar.nombre.length > 20
                                              ? similar.nombre.substring(
                                                  0,
                                                  17,
                                                ) + "..."
                                              : similar.nombre}
                                          </Badge>
                                        ))}
                                      {product.productos_similares.length >
                                        2 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          +
                                          {product.productos_similares.length -
                                            2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="flex flex-wrap gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleIncreaseStock(product)}
                                  className="flex-1 h-8 text-xs"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Añadir Stock
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Vista desktop - Tabla responsiva sin scroll */}
                    <div className="hidden xl:block">
                      <div className="w-full border rounded-lg">
                        <div className="overflow-x-auto">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[70px]">Img</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="min-w-[150px]">Ubicación</TableHead>
                                <TableHead className="min-w-[150px]">
                                  Código de Barras
                                </TableHead>
                                <TableHead className="min-w-[150px]">
                                  Similares
                                </TableHead>
                                <TableHead className="w-[100px]">
                                  Stock
                                </TableHead>
                                <TableHead className="w-[100px]">
                                  Precio
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {products.map((product) => {
                                return (
                                  <TableRow key={product.idproducto}>
                                    <TableCell>
                                      <div className="w-10 h-10">
                                        <ImageCarousel
                                          images={[getImageUrl(product.imagen)]}
                                          productName={product.nombre}
                                          className="w-10 h-10"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium text-sm">
                                          {product.nombre}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {product.categorias
                                            .slice(0, 2)
                                            .map((categoria, index) => (
                                              <Badge
                                                key={index}
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {categoria.length > 10
                                                  ? categoria.substring(0, 8) +
                                                    "..."
                                                  : categoria}
                                              </Badge>
                                            ))}
                                          {product.categorias.length > 2 && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              +{product.categorias.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <RenderUbicaciones 
                                        ubicaciones={product.ubicaciones || []} 
                                        bodegaId={userBodegaId}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {product.codigo_barras ? (
                                        <span className="text-sm font-mono break-all">
                                          {product.codigo_barras}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          —
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {product.productos_similares &&
                                      product.productos_similares.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {product.productos_similares
                                            .slice(0, 2)
                                            .map((similar, idx) => (
                                              <Badge
                                                key={idx}
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {similar.nombre.length > 12
                                                  ? similar.nombre.substring(
                                                      0,
                                                      10,
                                                    ) + "..."
                                                  : similar.nombre}
                                              </Badge>
                                            ))}
                                          {product.productos_similares.length >
                                            2 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              +
                                              {product.productos_similares
                                                .length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          —
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div className="text-sm font-semibold text-primary">
                                          {product.stock}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleIncreaseStock(product)
                                          }
                                          className="h-7 text-xs px-2"
                                        >
                                          <Package className="h-2.5 w-2.5 mr-1" />
                                          +
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm font-semibold">
                                        Bs{" "}
                                        {Number(product.precio_venta).toFixed(
                                          2,
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              {searchTerm.trim().length >= 2 &&
                !searching &&
                products.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                )}

              {searchTerm.trim().length < 2 &&
                !showAllProducts &&
                !searching && (
                  <div className="text-center text-muted-foreground py-8">
                    Ingresa al menos 2 caracteres en el buscador o haz clic en
                    "Ver todos los productos" para mostrar el inventario.
                  </div>
                )}

              {showAllProducts && products.length === 0 && !loadingAll && (
                <div className="text-center text-muted-foreground py-8">
                  No hay productos registrados.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}