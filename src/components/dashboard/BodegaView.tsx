// src/components/dashboard/BodegaView.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Package,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  Warehouse,
  Filter,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormularioProductos } from "./FormularioProductos";
import {
  getUbicaciones,
  getCategorias,
  getBodegasActivas,
  getProductosByBodega,
  getAllProductosBodega,
  createProductoBodega,
  updateProductoBodega,
  deleteProductoBodega,
  transferirProducto,
  getMovimientosBodega,
  buscarProductosBodega,
  createBodega,
  ProductoBodega,
  Sucursal,
  MovimientoBodega,
} from "@/api/BodegaApi";

// Componente para el carrusel de imágenes
interface ImageCarouselProps {
  images: string[];
  productName: string;
  className?: string;
}

function ImageCarousel({ images, productName, className = "" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
      >
        <Warehouse className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
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
              onClick={() => setCurrentIndex(index)}
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

// Función para obtener URL de imagen
export const getImageUrl = (imagen: string | undefined | null | any): string => {
  const fallbackImage = "https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png";
  
  if (!imagen) {
    return fallbackImage;
  }
  
  if (typeof imagen === 'string') {
    if (imagen.startsWith('data:image')) {
      return imagen;
    }
    if (imagen.startsWith('http')) {
      return imagen;
    }
    return `data:image/jpeg;base64,${imagen}`;
  }
  
  if (Array.isArray(imagen)) {
    try {
      const byteArray = new Uint8Array(imagen);
      let binary = '';
      for (let i = 0; i < byteArray.length; i++) {
        binary += String.fromCharCode(byteArray[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    } catch (error) {
      return fallbackImage;
    }
  }
  
  if (typeof imagen === 'object' && imagen !== null) {
    try {
      if (imagen.data && Array.isArray(imagen.data)) {
        const byteArray = new Uint8Array(imagen.data);
        let binary = '';
        for (let i = 0; i < byteArray.length; i++) {
          binary += String.fromCharCode(byteArray[i]);
        }
        return `data:image/jpeg;base64,${btoa(binary)}`;
      }
      if (imagen.type === 'Buffer' && imagen.data) {
        const byteArray = new Uint8Array(imagen.data);
        let binary = '';
        for (let i = 0; i < byteArray.length; i++) {
          binary += String.fromCharCode(byteArray[i]);
        }
        return `data:image/jpeg;base64,${btoa(binary)}`;
      }
    } catch (error) {
      return fallbackImage;
    }
  }
  
  return fallbackImage;
};

export function BodegaView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isNewSucursalDialogOpen, setIsNewSucursalDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoBodega | null>(null);
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [cantidadTransferir, setCantidadTransferir] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productos, setProductos] = useState<ProductoBodega[]>([]);
  const [filterBajoStock, setFilterBajoStock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<{ idcategoria: number; nombre: string }[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBodega[]>([]);
  const [selectedBodega, setSelectedBodega] = useState<number | null>(null);
  const [bodegas, setBodegas] = useState<any[]>([]);
  const [newSucursalData, setNewSucursalData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
  });
  const [isCreatingSucursal, setIsCreatingSucursal] = useState(false);
  const { toast } = useToast();

  const userRole = localStorage.getItem("userRole") || "admin";
  const isAssistant = userRole === "Asistente";

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [ubicacionesData, categoriasData, bodegasData] = await Promise.all([
          getUbicaciones(),
          getCategorias(),
          getBodegasActivas(),
        ]);

        setUbicaciones(ubicacionesData.map((item) => item.nombre));
        setCategorias(categoriasData);
        setBodegas(bodegasData);
        setSucursales(
          bodegasData.map((b) => ({
            id: b.idbodega,
            nombre: b.nombre,
            ubicacion: b.direccion || "",
          }))
        );

        // Cargar productos de la primera bodega activa
        if (bodegasData.length > 0) {
          const firstBodega = bodegasData[0];
          setSelectedBodega(firstBodega.idbodega);
          const productosData = await getProductosByBodega(firstBodega.idbodega);
          setProductos(productosData);
        } else {
          const allProducts = await getAllProductosBodega();
          setProductos(allProducts);
        }

        // Cargar movimientos recientes
        const movimientosData = await getMovimientosBodega(undefined, 5);
        setMovimientos(movimientosData);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [toast]);

  // Cargar productos por bodega seleccionada
  const loadProductosByBodega = useCallback(async (idbodega: number) => {
    setLoadingAll(true);
    try {
      const productosData = await getProductosByBodega(idbodega);
      setProductos(productosData);
      setShowAllProducts(false);
    } catch (error) {
      console.error("Error cargando productos por bodega:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoadingAll(false);
    }
  }, [toast]);

  // Cargar todos los productos
  const loadAllProductos = useCallback(async () => {
    setLoadingAll(true);
    try {
      const allProducts = await getAllProductosBodega();
      setProductos(allProducts);
      setShowAllProducts(true);
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
  }, [toast]);

  // Recargar bodegas después de crear una nueva
  const reloadBodegas = useCallback(async () => {
    try {
      const bodegasData = await getBodegasActivas();
      setBodegas(bodegasData);
      setSucursales(
        bodegasData.map((b) => ({
          id: b.idbodega,
          nombre: b.nombre,
          ubicacion: b.direccion || "",
        }))
      );
    } catch (error) {
      console.error("Error recargando bodegas:", error);
    }
  }, []);

  // Manejar cambio de bodega
  const handleBodegaChange = (idbodega: number) => {
    setSelectedBodega(idbodega);
    setSearchTerm("");
    setFilterBajoStock(false);
    if (idbodega) {
      loadProductosByBodega(idbodega);
    } else {
      loadAllProductos();
    }
  };

  // Función de búsqueda
  const performSearch = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const results = await buscarProductosBodega(query, selectedBodega || undefined);
      setProductos(results);
    } catch (error) {
      console.error("Error buscando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron buscar los productos",
        variant: "destructive",
      });
      setProductos([]);
    } finally {
      setSearching(false);
    }
  }, [selectedBodega, toast]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm);
      } else if (searchTerm.trim().length === 0 && !showAllProducts && selectedBodega) {
        loadProductosByBodega(selectedBodega);
      } else if (searchTerm.trim().length === 0 && showAllProducts) {
        loadAllProductos();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, performSearch, showAllProducts, selectedBodega, loadProductosByBodega, loadAllProductos]);

  // Filtrar productos (stock bajo)
  const filteredProducts = useMemo(() => {
    let result = productos;
    
    if (filterBajoStock) {
      result = result.filter((p) => p.stock <= p.stockMinimo);
    }

    return result;
  }, [productos, filterBajoStock]);

  // Calcular stock total
  const totalStock = useMemo(() => {
    return productos.reduce((sum, p) => sum + p.stock, 0);
  }, [productos]);

  // Productos con stock bajo
  const productosBajoStock = useMemo(() => {
    return productos.filter((p) => p.stock <= p.stockMinimo);
  }, [productos]);

  const handleTransferir = (product: ProductoBodega) => {
    setSelectedProduct(product);
    setSelectedSucursal("");
    setCantidadTransferir("");
    setIsTransferDialogOpen(true);
  };

  const confirmarTransferencia = async () => {
    if (!selectedProduct || !selectedSucursal || !cantidadTransferir) {
      toast({
        title: "Error",
        description: "Completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const cantidad = parseInt(cantidadTransferir);
    if (isNaN(cantidad) || cantidad <= 0) {
      toast({
        title: "Error",
        description: "Ingresa una cantidad válida",
        variant: "destructive",
      });
      return;
    }

    if (cantidad > selectedProduct.stock) {
      toast({
        title: "Error",
        description: "Stock insuficiente en bodega",
        variant: "destructive",
      });
      return;
    }

    try {
      const sucursalDestino = sucursales.find(s => s.nombre === selectedSucursal);
      if (!sucursalDestino) {
        toast({
          title: "Error",
          description: "Sucursal destino no encontrada",
          variant: "destructive",
        });
        return;
      }

      await transferirProducto({
        idproducto: selectedProduct.id,
        idbodegaOrigen: selectedBodega || 1,
        idbodegaDestino: sucursalDestino.id,
        cantidad,
      });

      toast({
        title: "Transferencia exitosa",
        description: `${cantidad} unidades de ${selectedProduct.nombre} enviadas a ${selectedSucursal}`,
      });

      if (showAllProducts) {
        await loadAllProductos();
      } else if (selectedBodega) {
        await loadProductosByBodega(selectedBodega);
      }

      const movimientosData = await getMovimientosBodega(undefined, 5);
      setMovimientos(movimientosData);

      setIsTransferDialogOpen(false);
      setSelectedProduct(null);
      setSelectedSucursal("");
      setCantidadTransferir("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la transferencia",
        variant: "destructive",
      });
    }
  };

  const handleCrearSucursal = async () => {
    if (!newSucursalData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la sucursal es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingSucursal(true);
    try {
      const data = await createBodega({
        nombre: newSucursalData.nombre,
        tipo: "Sucursal",
        direccion: newSucursalData.direccion || "",
        telefono: newSucursalData.telefono || "",
      });

      toast({
        title: "Sucursal creada",
        description: `La sucursal "${data.nombre}" ha sido creada exitosamente.`,
      });

      await reloadBodegas();
      setIsNewSucursalDialogOpen(false);
      setNewSucursalData({ nombre: "", direccion: "", telefono: "" });

      if (data.idbodega) {
        setSelectedBodega(data.idbodega);
        await loadProductosByBodega(data.idbodega);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la sucursal",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSucursal(false);
    }
  };

  const handleEdit = (product: ProductoBodega) => {
    if (isAssistant) return;
    
    const categoriaEncontrada = categorias.find(c => c.nombre === product.categoria);
    
    setEditingProduct({
      idproducto: product.id,
      nombre: product.nombre,
      codigo_barras: product.codigo,
      categorias: categoriaEncontrada ? [categoriaEncontrada.idcategoria] : [],
      stock: product.stock,
      ubicacion: product.ubicacion,
      precio_venta: product.precio,
      stock_minimo: product.stockMinimo,
      idbodega: selectedBodega,
      descripcion: product.descripcion || "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (isAssistant) return;

    try {
      await deleteProductoBodega(id);
      toast({
        title: "Producto eliminado",
        description: `${nombre} ha sido eliminado.`,
        variant: "destructive",
      });

      if (showAllProducts) {
        await loadAllProductos();
      } else if (selectedBodega) {
        await loadProductosByBodega(selectedBodega);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (productData: any, isEditing: boolean) => {
    try {
      const formData = new FormData();
      
      formData.append("nombre", productData.nombre);
      formData.append("descripcion", productData.descripcion || "");
      formData.append("idubicacion", productData.idubicacion?.toString() || "1");
      formData.append("precio_venta", productData.precio_venta?.toString() || "0");
      formData.append("precio_compra", productData.precio_compra?.toString() || "0");
      formData.append("stock", productData.stock?.toString() || "0");
      formData.append("stock_minimo", productData.stock_minimo?.toString() || "0");
      
      if (productData.codigo_barras) {
        formData.append("codigo_barras", productData.codigo_barras);
      }
      
      if (selectedBodega) {
        formData.append("idbodega", selectedBodega.toString());
      }
      
      let categoriasIds: number[] = [];
      if (productData.categorias && productData.categorias.length > 0) {
        categoriasIds = productData.categorias.map((c: any) => {
          if (typeof c === 'object' && c !== null) {
            return c.id || c.idcategoria || c;
          }
          return typeof c === 'string' ? parseInt(c) : c;
        }).filter((id: number) => !isNaN(id));
      }
      
      formData.append("categorias", JSON.stringify(categoriasIds));
      
      if (productData.productos_similares && productData.productos_similares.length > 0) {
        const similaresIds = productData.productos_similares.map((s: any) => {
          if (typeof s === 'object' && s !== null) {
            return s.idproducto || s.id || s;
          }
          return typeof s === 'string' ? parseInt(s) : s;
        }).filter((id: number) => !isNaN(id));
        formData.append("productos_similares", JSON.stringify(similaresIds));
      }
      
      if (productData.imagen && typeof productData.imagen !== "string") {
        formData.append("imagen", productData.imagen);
      }

      if (isEditing && editingProduct) {
        await updateProductoBodega(editingProduct.idproducto, formData);
        toast({
          title: "Producto actualizado",
          description: `${productData.nombre} ha sido actualizado.`,
        });
      } else {
        await createProductoBodega(formData);
        toast({
          title: "Producto agregado",
          description: `${productData.nombre} ha sido agregado.`,
        });
      }

      if (showAllProducts) {
        await loadAllProductos();
      } else if (selectedBodega) {
        await loadProductosByBodega(selectedBodega);
      }

      setEditingProduct(null);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error en handleFormSubmit:", error);
      toast({
        title: "Error",
        description: error.message || `No se pudo ${isEditing ? "editar" : "agregar"} el producto`,
        variant: "destructive",
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Cargando bodega...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
          <Warehouse className="h-7 w-7" />
          Bodega Central
        </h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-auto"
            value={selectedBodega || ""}
            onChange={(e) => handleBodegaChange(Number(e.target.value))}
          >
            <option value="">Todas las bodegas</option>
            {bodegas.map((b) => (
              <option key={b.idbodega} value={b.idbodega}>
                {b.nombre} {b.tipo === 'Principal' ? '⭐' : ''}
              </option>
            ))}
          </select>

          <Button
            variant={filterBajoStock ? "default" : "outline"}
            onClick={() => setFilterBajoStock(!filterBajoStock)}
            className="w-full sm:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            {filterBajoStock ? "Mostrar todos" : "Stock bajo"}
            {filterBajoStock && (
              <Badge variant="secondary" className="ml-2">
                {productosBajoStock.length}
              </Badge>
            )}
          </Button>

          {!isAssistant && (
            <Dialog
              open={isFormOpen}
              onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) {
                  handleFormCancel();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar Producto</span>
                  <span className="sm:hidden">Agregar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle>
                    {editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
                  </DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6">
                  <FormularioProductos
                    product={editingProduct}
                    ubicaciones={ubicaciones}
                    categorias={categorias.map(c => c.nombre)}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold">{productos.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Total</p>
                <p className="text-2xl font-bold">{totalStock}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Warehouse className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-500">{productosBajoStock.length}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Eye className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sucursales</p>
                <p className="text-2xl font-bold">{sucursales.length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de productos en bodega */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>
            Inventario en Bodega
            {filterBajoStock && (
              <Badge variant="destructive" className="ml-2">
                Filtro: Stock bajo
              </Badge>
            )}
            {loadingAll && <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />}
          </CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Vista móvil - Cards */}
          <div className="block lg:hidden space-y-3 w-full">
            {filteredProducts.map((product) => {
              const imageUrl = product.imagen ? getImageUrl(product.imagen) : "";
              return (
                <Card key={product.id} className="p-3 w-full">
                  <div className="space-y-3 w-full">
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-shrink-0 w-16 h-16">
                        <ImageCarousel
                          images={imageUrl ? [imageUrl] : []}
                          productName={product.nombre}
                          className="w-16 h-16"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 break-words">
                          {product.nombre}
                        </h3>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {product.categoria}
                        </Badge>
                        {product.bodega_nombre && (
                          <Badge variant="outline" className="text-xs mt-1 ml-1">
                            {product.bodega_nombre}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div>
                        <span className="font-medium">Código:</span>
                        <span className="text-muted-foreground ml-1">{product.codigo}</span>
                      </div>
                      <div>
                        <span className="font-medium">Stock:</span>
                        <span className={`ml-1 font-semibold ${product.stock <= product.stockMinimo ? 'text-red-500' : 'text-primary'}`}>
                          {product.stock} u.
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Stock Min:</span>
                        <span className="text-muted-foreground ml-1">{product.stockMinimo} u.</span>
                      </div>
                      <div>
                        <span className="font-medium">Ubicación:</span>
                        <span className="text-muted-foreground ml-1">{product.ubicacion}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Precio:</span>
                        <span className="text-primary ml-1 font-semibold">
                          Bs {product.precio.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {product.stock <= product.stockMinimo && (
                      <Badge variant="destructive" className="text-xs">
                        Stock bajo
                      </Badge>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransferir(product)}
                        className="flex-1 h-8 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Transferir
                      </Button>
                      {!isAssistant && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="flex-1 h-8 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-8 text-xs"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará
                                  permanentemente el producto "{product.nombre}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id, product.nombre)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden lg:block">
            <div className="w-full border rounded-lg">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Stock Mínimo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const imageUrl = product.imagen ? getImageUrl(product.imagen) : "";
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 flex-shrink-0">
                                <ImageCarousel
                                  images={imageUrl ? [imageUrl] : []}
                                  productName={product.nombre}
                                  className="w-10 h-10"
                                />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{product.nombre}</div>
                                <div className="text-xs text-muted-foreground">{product.proveedor}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono">{product.codigo}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {product.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{product.ubicacion}</TableCell>
                          <TableCell className="text-sm">
                            {product.bodega_nombre || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${product.stock <= product.stockMinimo ? 'text-red-500' : 'text-primary'}`}>
                              {product.stock}
                            </span>
                            {product.stock <= product.stockMinimo && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                Bajo stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {product.stockMinimo}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            Bs {product.precio.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTransferir(product)}
                                className="h-8 text-xs"
                                title="Transferir"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                              {!isAssistant && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(product)}
                                    className="h-8 w-8 p-0"
                                    title="Editar"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará
                                          permanentemente el producto "{product.nombre}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(product.id, product.nombre)}
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
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

          {filteredProducts.length === 0 && !loadingAll && (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm.trim().length >= 2
                ? "No se encontraron productos que coincidan con la búsqueda."
                : filterBajoStock
                ? "No hay productos con stock bajo"
                : "No hay productos en esta bodega"}
            </div>
          )}

          {loadingAll && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Cargando productos...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movimientos recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movimientos.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No hay movimientos recientes
              </div>
            ) : (
              movimientos.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${mov.tipo === 'entrada' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {mov.tipo === 'entrada' ? (
                        <Package className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{mov.productoNombre || "Producto"}</p>
                      <p className="text-xs text-muted-foreground">
                        {mov.tipo === 'entrada' ? 'Ingreso' : 'Salida'} - {mov.cantidad || 0} unidades
                        {mov.destino && ` → ${mov.destino}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{mov.fecha || ""}</p>
                    <p className="text-xs text-muted-foreground">{mov.usuario || "Sistema"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de transferencia con botón para crear nueva sucursal */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir a Sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Producto</p>
              <p className="text-lg font-semibold text-primary">{selectedProduct?.nombre}</p>
              <p className="text-sm text-muted-foreground">Stock disponible: {selectedProduct?.stock} unidades</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sucursal destino</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsTransferDialogOpen(false);
                    setIsNewSucursalDialogOpen(true);
                  }}
                  className="h-7 text-xs"
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Nueva Sucursal
                </Button>
              </div>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
              >
                <option value="">Seleccionar sucursal...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre} - {s.ubicacion}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad a transferir</label>
              <Input
                type="number"
                placeholder="0"
                value={cantidadTransferir}
                onChange={(e) => setCantidadTransferir(e.target.value)}
                min="0"
                max={selectedProduct?.stock}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Stock restante en bodega:{" "}
                <span className="font-semibold text-primary">
                  {selectedProduct ? selectedProduct.stock - (parseInt(cantidadTransferir) || 0) : 0}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarTransferencia}
              className="bg-primary hover:bg-primary/90"
              disabled={!selectedSucursal || !cantidadTransferir || parseInt(cantidadTransferir) <= 0}
            >
              Confirmar Transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear nueva sucursal */}
      <Dialog open={isNewSucursalDialogOpen} onOpenChange={setIsNewSucursalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Crear Nueva Sucursal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Sucursal *</label>
              <Input
                placeholder="Ej: Sucursal Norte"
                value={newSucursalData.nombre}
                onChange={(e) => setNewSucursalData({ ...newSucursalData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                placeholder="Dirección de la sucursal"
                value={newSucursalData.direccion}
                onChange={(e) => setNewSucursalData({ ...newSucursalData, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                placeholder="Teléfono de contacto"
                value={newSucursalData.telefono}
                onChange={(e) => setNewSucursalData({ ...newSucursalData, telefono: e.target.value })}
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p>La sucursal se creará con tipo "Sucursal" y estará activa por defecto.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSucursalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrearSucursal}
              className="bg-primary hover:bg-primary/90"
              disabled={!newSucursalData.nombre.trim() || isCreatingSucursal}
            >
              {isCreatingSucursal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Sucursal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}