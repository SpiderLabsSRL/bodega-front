// src/components/dashboard/InventarioView.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Filter, RefreshCw, X, Warehouse, DollarSign, TrendingUp, Package } from "lucide-react";
import { DashboardView } from "@/pages/Dashboard";
import { getInventory, getLowMarginCount, InventoryItem, getCategories, Category, getSucursales, SucursalOption } from "@/api/InventoryApi";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InventarioViewProps {
  onViewChange?: (view: DashboardView, params?: { searchProductId?: string; searchProductName?: string; searchBodegaId?: number }) => void;
}

export const InventarioView = ({ onViewChange }: InventarioViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowMarginOnly, setShowLowMarginOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowMarginCount, setLowMarginCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalInvertido, setTotalInvertido] = useState(0);
  const [totalGanancia, setTotalGanancia] = useState(0);
  
  // Estado para detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Función para verificar si es móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Verificar al cargar
    checkMobile();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkMobile);
    
    // Limpiar event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    sessionStorage.removeItem('searchProductId');
    sessionStorage.removeItem('searchProductName');
    sessionStorage.removeItem('searchBodegaId');
    loadInventoryData();
    loadLowMarginCount();
    loadCategories();
    loadSucursales();
  }, []);

  useEffect(() => {
    loadInventoryData();
  }, [searchTerm, showLowMarginOnly, selectedCategories, selectedSucursal]);

  useEffect(() => {
    loadLowMarginCount();
  }, [selectedSucursal]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInventory(
        searchTerm || undefined, 
        showLowMarginOnly || undefined,
        selectedCategories.length > 0 ? selectedCategories : undefined,
        selectedSucursal || undefined
      );
      setInventoryData(response.items);
      setTotalInvertido(response.totalInvertido || 0);
      setTotalGanancia(response.totalGanancia || 0);
    } catch (err) {
      console.error("Error loading inventory:", err);
      setError("No se pudieron cargar los datos del inventario");
    } finally {
      setLoading(false);
    }
  };

  const loadLowMarginCount = async () => {
    try {
      const count = await getLowMarginCount(selectedSucursal || undefined);
      setLowMarginCount(count);
    } catch (err) {
      console.error("Error loading low margin count:", err);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadSucursales = async () => {
    try {
      const sucursalesData = await getSucursales();
      setSucursales(sucursalesData);
    } catch (err) {
      console.error("Error loading sucursales:", err);
    }
  };

  const handleRefresh = () => {
    loadInventoryData();
    loadLowMarginCount();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearCategoryFilters = () => {
    setSelectedCategories([]);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSearchTerm("");
    setShowLowMarginOnly(false);
    setSelectedSucursal(null);
  };

  const handleViewProduct = (item: InventoryItem) => {
    sessionStorage.setItem('searchProductId', item.id);
    sessionStorage.setItem('searchProductName', item.nombre);
    
    if (selectedSucursal) {
      sessionStorage.setItem('searchBodegaId', selectedSucursal.toString());
    } else {
      if (item.bodegasStock && item.bodegasStock.length > 0) {
        sessionStorage.setItem('searchBodegaId', item.bodegasStock[0].idbodega.toString());
      } else if (item.idbodega) {
        sessionStorage.setItem('searchBodegaId', item.idbodega.toString());
      } else {
        sessionStorage.removeItem('searchBodegaId');
      }
    }
    
    if (onViewChange) {
      onViewChange('bodega', { 
        searchProductId: item.id, 
        searchProductName: item.nombre,
        searchBodegaId: selectedSucursal || (item.bodegasStock?.[0]?.idbodega) || item.idbodega
      });
    }
  };

  const formatCurrency = (value: number) => {
    return `Bs. ${value.toFixed(2)}`;
  };

  const getStockColor = (stock: number, stockMinimo: number) => {
    if (stock <= stockMinimo) return 'text-red-600';
    if (stock <= stockMinimo * 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Renderizado de tarjeta para móvil
  const renderMobileCard = (item: InventoryItem) => {
    return (
      <Card 
        key={item.id} 
        className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleViewProduct(item)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{item.nombre}</h3>
              <p className="text-xs text-muted-foreground font-mono">{item.codigo}</p>
            </div>
            <div className="flex gap-1 ml-2 flex-shrink-0 flex-wrap justify-end">
              {item.cantidad <= item.stockMinimo && (
                <Badge variant="destructive" className="text-xs">
                  Stock mínimo
                </Badge>
              )}
              {!selectedSucursal && item.bodegasStock && item.bodegasStock.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  {item.bodegasStock.length} bodegas
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Stock por bodega */}
            <div className="col-span-2 bg-muted/30 rounded-md p-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Package className="h-3 w-3" />
                <span>Stock por bodega</span>
              </div>
              {selectedSucursal ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    Stock: <span className={`font-semibold ${getStockColor(item.cantidad, item.stockMinimo)}`}>
                      {item.cantidad}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Mínimo: {item.stockMinimo}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  {item.bodegasStock && item.bodegasStock.length > 0 ? (
                    item.bodegasStock.map((bs) => (
                      <div key={bs.idbodega} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{bs.bodegaNombre}</span>
                        <span className={`font-semibold ${getStockColor(bs.stock, bs.stockMinimo)}`}>
                          {bs.stock}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin stock en bodegas</span>
                  )}
                </div>
              )}
            </div>

            {/* Precios */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-2">
              <p className="text-xs text-muted-foreground">Precio Compra</p>
              <p className="font-semibold text-blue-600">{formatCurrency(item.precioCompra)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-2">
              <p className="text-xs text-muted-foreground">Precio Venta</p>
              <p className="font-semibold">{formatCurrency(item.precioVenta)}</p>
            </div>

            {/* Totales */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-2">
              <p className="text-xs text-muted-foreground">Total Invertido</p>
              <p className="font-semibold text-blue-600">{formatCurrency(item.totalInvertido)}</p>
            </div>
            <div className={`rounded-md p-2 ${
              item.totalGanancia >= 0 
                ? 'bg-green-50 dark:bg-green-950/30' 
                : 'bg-red-50 dark:bg-red-950/30'
            }`}>
              <p className="text-xs text-muted-foreground">Total Ganancia</p>
              <p className={`font-semibold ${
                item.totalGanancia >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(item.totalGanancia)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewProduct(item);
              }}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver detalles
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Inventario</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bodegaNames = selectedSucursal 
    ? [] 
    : Array.from(new Set(inventoryData.flatMap(item => 
        item.bodegasStock?.map(bs => bs.bodegaNombre) || []
      )));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Inventario</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          <select
            className="h-9 px-3 border rounded-md bg-background text-sm"
            value={selectedSucursal || ""}
            onChange={(e) => setSelectedSucursal(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas las bodegas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="mr-2 h-4 w-4" />
                Categorías
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Categorías</h4>
                  {selectedCategories.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCategoryFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryChange(category.id)}
                      />
                      <Label htmlFor={`category-${category.id}`} className="flex-1 cursor-pointer">
                        {category.nombre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {(selectedCategories.length > 0 || searchTerm || showLowMarginOnly || selectedSucursal) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-9"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas de Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold">{inventoryData.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Warehouse className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invertido</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvertido)}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ganancia</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalGanancia)}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de inventario - Condicional para móvil/escritorio */}
      <Card>
        <CardHeader>
          <CardTitle>
            Productos en Inventario ({inventoryData.length})
            {loading && <span className="text-sm font-normal text-muted-foreground ml-2">Cargando...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : inventoryData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showLowMarginOnly 
                ? "No hay productos con margen bajo" 
                : "No se encontraron productos"
              }
            </div>
          ) : isMobile ? (
            // Vista móvil - Tarjetas
            <div className="space-y-3">
              {inventoryData.map((item) => renderMobileCard(item))}
            </div>
          ) : (
            // Vista escritorio - Tabla
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3 min-w-[150px]">Producto</TableHead>
                    <TableHead className="px-4 py-3 min-w-[100px]">Código</TableHead>
                    {selectedSucursal ? (
                      <>
                        <TableHead className="px-4 py-3 text-center min-w-[80px]">Stock</TableHead>
                        <TableHead className="px-4 py-3 text-center min-w-[80px]">Stock Mínimo</TableHead>
                      </>
                    ) : (
                      bodegaNames.map((nombre) => (
                        <TableHead key={nombre} className="px-4 py-3 text-center min-w-[80px]">
                          {nombre}
                        </TableHead>
                      ))
                    )}
                    <TableHead className="px-4 py-3 text-right min-w-[100px]">Precio Compra</TableHead>
                    <TableHead className="px-4 py-3 text-right min-w-[100px]">Precio Venta</TableHead>
                    <TableHead className="px-4 py-3 text-right min-w-[120px]">Total Invertido</TableHead>
                    <TableHead className="px-4 py-3 text-right min-w-[120px]">Total Ganancia</TableHead>
                    <TableHead className="px-4 py-3 text-center min-w-[60px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewProduct(item)}
                    >
                      <TableCell className="px-4 py-3 font-medium">
                        <div>
                          <div className="font-medium">{item.nombre}</div>
                          {item.cantidad <= item.stockMinimo && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Stock mínimo
                            </Badge>
                          )}
                          {!selectedSucursal && item.bodegasStock && item.bodegasStock.length > 1 && (
                            <Badge variant="outline" className="text-xs mt-1 ml-1">
                              {item.bodegasStock.length} bodegas
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-xs font-mono">{item.codigo}</span>
                      </TableCell>
                      {selectedSucursal ? (
                        <>
                          <TableCell className="px-4 py-3 text-center">
                            <span className={`font-semibold ${getStockColor(item.cantidad, item.stockMinimo)}`}>
                              {item.cantidad}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-muted-foreground">
                            {item.stockMinimo}
                          </TableCell>
                        </>
                      ) : (
                        bodegaNames.map((nombre) => {
                          const bodegaStock = item.bodegasStock?.find(bs => bs.bodegaNombre === nombre);
                          return (
                            <TableCell key={nombre} className="px-4 py-3 text-center">
                              {bodegaStock ? (
                                <span className={`font-semibold ${getStockColor(bodegaStock.stock, bodegaStock.stockMinimo)}`}>
                                  {bodegaStock.stock}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })
                      )}
                      <TableCell className="px-4 py-3 text-right text-blue-600 font-medium">
                        {formatCurrency(item.precioCompra)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-medium">
                        {formatCurrency(item.precioVenta)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-blue-600 font-medium">
                        {formatCurrency(item.totalInvertido)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <span className={`font-medium ${
                          item.totalGanancia >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.totalGanancia)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProduct(item);
                          }}
                          className="h-8 w-8 p-0"
                          title="Ver producto en bodega"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver producto</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};