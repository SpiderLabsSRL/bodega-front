import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getLowStockAlerts, Alert } from "@/api/AlertsApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageCarousel } from "./ProductosView";
import { getImageUrl } from "./VenderView";

export function AlertasView() {
  const [productosStockBajo, setProductosStockBajo] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const alerts = await getLowStockAlerts();
        setProductosStockBajo(alerts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar las alertas");
        console.error("Error loading alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Alertas de Stock Mínimo</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Productos con Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Alertas de Stock Mínimo</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular el total de variantes con stock bajo
  const totalVariantesStockBajo = productosStockBajo.reduce((total, producto) => {
    return total;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Alertas de Stock Mínimo</h1>
        <Badge variant="outline" className="text-lg">
          {totalVariantesStockBajo} variantes con stock bajo
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos con Stock Bajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="block md:overflow-x-auto">
            {productosStockBajo.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay productos con stock bajo en este momento.
              </div>
            ) : (
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="w-24">Imagen</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Stock Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosStockBajo.flatMap((producto) =>
                      <TableRow key={`${producto.id}`} className="md:table-row block border-b p-4 md:p-0">
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-4 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-2">IMAGEN</div>
                          <div className="w-20 h-20 md:w-20 md:h-20 mx-auto md:mx-0">
                            <ImageCarousel
                              images={[getImageUrl(producto.imagen)]}
                              productName={producto.producto}
                              className="w-20 h-20 md:w-20 md:h-20"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0 font-medium">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">PRODUCTO</div>
                          <div className="text-center md:text-left font-bold text-primary text-base">{producto.producto}</div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">UBICACIÓN</div>
                          <div className="text-center md:text-left text-base">{producto.ubicacion}</div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">STOCK ACTUAL</div>
                          <div className="flex justify-center md:justify-start">
                            <Badge variant="destructive" className="text-sm px-3 py-1 font-bold">
                              {producto.cantidad}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">STOCK MÍNIMO</div>
                          <div className="flex justify-center md:justify-start">
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              {producto.stockMinimo}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}