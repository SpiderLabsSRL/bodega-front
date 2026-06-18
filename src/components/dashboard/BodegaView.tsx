import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormularioProductos } from "./FormularioProductos";

// Datos mock para productos en bodega
interface ProductoBodega {
  id: number;
  nombre: string;
  codigo: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  ubicacion: string;
  precio: number;
  proveedor: string;
  imagen?: string;
}

// Datos mock para movimientos de bodega
interface MovimientoBodega {
  id: number;
  productoId: number;
  productoNombre: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  destino?: string;
  fecha: string;
  usuario: string;
}

// Datos mock para sucursales
interface Sucursal {
  id: number;
  nombre: string;
  ubicacion: string;
}

// Mock de productos en bodega
const mockProductosBodega: ProductoBodega[] = [
  {
    id: 1,
    nombre: "Paracetamol 500mg",
    codigo: "PAR-001",
    categoria: "Analgésicos",
    stock: 1500,
    stockMinimo: 200,
    ubicacion: "Estante A1",
    precio: 8.50,
    proveedor: "Laboratorios Andes",
  },
  {
    id: 2,
    nombre: "Ibuprofeno 400mg",
    codigo: "IBU-002",
    categoria: "Antiinflamatorios",
    stock: 800,
    stockMinimo: 100,
    ubicacion: "Estante A2",
    precio: 12.00,
    proveedor: "Laboratorios Andes",
  },
  {
    id: 3,
    nombre: "Amoxicilina 500mg",
    codigo: "AMO-003",
    categoria: "Antibióticos",
    stock: 350,
    stockMinimo: 50,
    ubicacion: "Estante B1",
    precio: 25.50,
    proveedor: "Farmalab",
  },
  {
    id: 4,
    nombre: "Omeprazol 20mg",
    codigo: "OME-004",
    categoria: "Gastrointestinales",
    stock: 1200,
    stockMinimo: 150,
    ubicacion: "Estante B2",
    precio: 15.00,
    proveedor: "Laboratorios Andes",
  },
  {
    id: 5,
    nombre: "Loratadina 10mg",
    codigo: "LOR-005",
    categoria: "Antihistamínicos",
    stock: 600,
    stockMinimo: 80,
    ubicacion: "Estante C1",
    precio: 18.00,
    proveedor: "Farmalab",
  },
  {
    id: 6,
    nombre: "Metformina 850mg",
    codigo: "MET-006",
    categoria: "Antidiabéticos",
    stock: 450,
    stockMinimo: 60,
    ubicacion: "Estante C2",
    precio: 22.00,
    proveedor: "Medicorp",
  },
  {
    id: 7,
    nombre: "Enalapril 10mg",
    codigo: "ENA-007",
    categoria: "Cardiovasculares",
    stock: 300,
    stockMinimo: 40,
    ubicacion: "Estante D1",
    precio: 28.00,
    proveedor: "Medicorp",
  },
  {
    id: 8,
    nombre: "Alprazolam 0.5mg",
    codigo: "ALP-008",
    categoria: "Ansiolíticos",
    stock: 200,
    stockMinimo: 30,
    ubicacion: "Estante D2",
    precio: 35.00,
    proveedor: "Laboratorios Andes",
  },
  {
    id: 9,
    nombre: "Clotrimazol 1%",
    codigo: "CLO-009",
    categoria: "Antifúngicos",
    stock: 500,
    stockMinimo: 70,
    ubicacion: "Estante E1",
    precio: 20.00,
    proveedor: "Farmalab",
  },
  {
    id: 10,
    nombre: "Diclofenaco 50mg",
    codigo: "DIC-010",
    categoria: "Antiinflamatorios",
    stock: 700,
    stockMinimo: 90,
    ubicacion: "Estante E2",
    precio: 10.00,
    proveedor: "Laboratorios Andes",
  },
];

// Mock de sucursales
const mockSucursales: Sucursal[] = [
  { id: 1, nombre: "Sucursal Centro", ubicacion: "Av. Principal 123" },
  { id: 2, nombre: "Sucursal Norte", ubicacion: "Calle 5, Zona Norte" },
  { id: 3, nombre: "Sucursal Sur", ubicacion: "Av. Libertad 456" },
];

// Mock de movimientos recientes
const mockMovimientos: MovimientoBodega[] = [
  {
    id: 1,
    productoId: 1,
    productoNombre: "Paracetamol 500mg",
    tipo: "salida",
    cantidad: 200,
    destino: "Sucursal Centro",
    fecha: "2026-06-17 10:30",
    usuario: "Admin",
  },
  {
    id: 2,
    productoId: 3,
    productoNombre: "Amoxicilina 500mg",
    tipo: "salida",
    cantidad: 50,
    destino: "Sucursal Norte",
    fecha: "2026-06-17 09:15",
    usuario: "Admin",
  },
  {
    id: 3,
    productoId: 4,
    productoNombre: "Omeprazol 20mg",
    tipo: "entrada",
    cantidad: 300,
    destino: "",
    fecha: "2026-06-16 16:45",
    usuario: "Admin",
  },
  {
    id: 4,
    productoId: 2,
    productoNombre: "Ibuprofeno 400mg",
    tipo: "salida",
    cantidad: 100,
    destino: "Sucursal Sur",
    fecha: "2026-06-16 14:20",
    usuario: "Admin",
  },
];

// Datos mock para opciones del formulario
const mockUbicaciones = [
  "Estante A1",
  "Estante A2",
  "Estante B1",
  "Estante B2",
  "Estante C1",
  "Estante C2",
  "Estante D1",
  "Estante D2",
  "Estante E1",
  "Estante E2",
];

const mockCategorias = [
  "Analgésicos",
  "Antiinflamatorios",
  "Antibióticos",
  "Gastrointestinales",
  "Antihistamínicos",
  "Antidiabéticos",
  "Cardiovasculares",
  "Ansiolíticos",
  "Antifúngicos",
];

// Componente para el carrusel de imágenes (reutilizado)
interface ImageCarouselProps {
  images: string[];
  productName: string;
  className?: string;
}

function ImageCarousel({ images, productName, className = "" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
      >
        <Warehouse className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

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
      </div>
    </div>
  );
}

export function BodegaView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoBodega | null>(null);
  const [selectedSucursal, setSelectedSucursal] = useState<string>("");
  const [cantidadTransferir, setCantidadTransferir] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productos, setProductos] = useState<ProductoBodega[]>(mockProductosBodega);
  const [filterBajoStock, setFilterBajoStock] = useState(false);
  const { toast } = useToast();

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    let result = productos;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          p.codigo.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term) ||
          p.proveedor.toLowerCase().includes(term)
      );
    }

    if (filterBajoStock) {
      result = result.filter((p) => p.stock <= p.stockMinimo);
    }

    return result;
  }, [productos, searchTerm, filterBajoStock]);

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

  const confirmarTransferencia = () => {
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

    // Actualizar stock del producto
    setProductos(
      productos.map((p) =>
        p.id === selectedProduct.id
          ? { ...p, stock: p.stock - cantidad }
          : p
      )
    );

    toast({
      title: "Transferencia exitosa",
      description: `${cantidad} unidades de ${selectedProduct.nombre} enviadas a ${selectedSucursal}`,
    });

    setIsTransferDialogOpen(false);
    setSelectedProduct(null);
    setSelectedSucursal("");
    setCantidadTransferir("");
  };

  const handleEdit = (product: ProductoBodega) => {
    // Convertir ProductoBodega a formato que espera FormularioProductos
    setEditingProduct({
      idproducto: product.id,
      nombre: product.nombre,
      codigo_barras: product.codigo,
      categorias: [product.categoria],
      stock: product.stock,
      ubicacion: product.ubicacion,
      precio_venta: product.precio,
      // stockMinimo no está en el formulario original, lo pasamos como extra
      stock_minimo: product.stockMinimo,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number, nombre: string) => {
    setProductos(productos.filter((p) => p.id !== id));
    toast({
      title: "Producto eliminado",
      description: `${nombre} ha sido eliminado.`,
      variant: "destructive",
    });
  };

  const handleFormSubmit = (productData: any, isEditing: boolean) => {
    try {
      if (isEditing && editingProduct) {
        // Editar producto existente
        setProductos(
          productos.map((p) =>
            p.id === editingProduct.idproducto
              ? {
                  ...p,
                  nombre: productData.nombre,
                  codigo: productData.codigo_barras || p.codigo,
                  categoria: productData.categorias?.[0] || p.categoria,
                  stock: productData.stock || p.stock,
                  stockMinimo: productData.stock_minimo || p.stockMinimo,
                  ubicacion: productData.ubicacion || p.ubicacion,
                  precio: productData.precio_venta || p.precio,
                  proveedor: productData.proveedor || p.proveedor,
                }
              : p
          )
        );
        toast({
          title: "Producto actualizado",
          description: `${productData.nombre} ha sido actualizado.`,
        });
      } else {
        // Agregar nuevo producto
        const newProduct: ProductoBodega = {
          id: Math.max(...productos.map((p) => p.id), 0) + 1,
          nombre: productData.nombre,
          codigo: productData.codigo_barras || `COD-${Date.now()}`,
          categoria: productData.categorias?.[0] || "Sin categoría",
          stock: productData.stock || 0,
          stockMinimo: productData.stock_minimo || 0,
          ubicacion: productData.ubicacion || "Sin ubicación",
          precio: productData.precio_venta || 0,
          proveedor: productData.proveedor || "Sin proveedor",
        };
        setProductos([...productos, newProduct]);
        toast({
          title: "Producto agregado",
          description: `${productData.nombre} ha sido agregado.`,
        });
      }

      setEditingProduct(null);
      setIsFormOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? "editar" : "agregar"} el producto`,
        variant: "destructive",
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const getMovimientosRecientes = () => {
    return mockMovimientos.slice(0, 5);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
          <Warehouse className="h-7 w-7" />
          Bodega Central
        </h1>
        <div className="flex flex-col sm:flex-row gap-2">
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
                  ubicaciones={mockUbicaciones}
                  categorias={mockCategorias}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                />
              </div>
            </DialogContent>
          </Dialog>
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
                <p className="text-2xl font-bold">{mockSucursales.length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <ArrowRight className="h-6 w-6 text-green-500" />
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
          </CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Vista móvil - Cards */}
          <div className="block lg:hidden space-y-3 w-full">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="p-3 w-full">
                <div className="space-y-3 w-full">
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 w-16 h-16">
                      <ImageCarousel
                        images={[]}
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
                  </div>
                </div>
              </Card>
            ))}
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
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Stock Mínimo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{product.nombre}</div>
                          <div className="text-xs text-muted-foreground">{product.proveedor}</div>
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
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {filterBajoStock 
                ? "No hay productos con stock bajo" 
                : "No se encontraron productos"}
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
            {getMovimientosRecientes().map((mov) => (
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
                    <p className="font-medium text-sm">{mov.productoNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {mov.tipo === 'entrada' ? 'Ingreso' : 'Salida'} - {mov.cantidad} unidades
                      {mov.destino && ` → ${mov.destino}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{mov.fecha}</p>
                  <p className="text-xs text-muted-foreground">{mov.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de transferencia */}
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
              <label className="text-sm font-medium">Sucursal destino</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
              >
                <option value="">Seleccionar sucursal...</option>
                {mockSucursales.map((s) => (
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
    </div>
  );
}