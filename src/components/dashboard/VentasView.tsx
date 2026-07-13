// src/components/dashboard/VentasView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Download, Calendar as CalendarRangeIcon, Printer, Loader2, Check, X, Eye, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getVentas, getTotalesVentas, getUsuariosVentas, getVentasHoyAsistente, getBodegas, Venta, VentasFiltros, TotalesVentas, BackendUsuario, BackendBodega } from "@/api/VentasApi";
import { getUserRole, getCurrentUser, getUserBodega } from "@/api/AuthApi";
import { generateVentaPDF } from "./VentasPDF";
import { VentasTablaPDF } from "./VentasTablaPDF";
import { pdf } from "@react-pdf/renderer";

interface UsuarioOption {
  value: string;
  label: string;
  username: string;
}

interface BodegaOption {
  value: number;
  label: string;
}

// Función para obtener la fecha actual en Bolivia (GMT-4)
const getFechaBolivia = () => {
  const now = new Date();
  const boliviaOffset = -4 * 60;
  const localOffset = now.getTimezoneOffset();
  const diff = boliviaOffset - localOffset;
  const fechaBolivia = new Date(now.getTime() + diff * 60000);
  fechaBolivia.setHours(0, 0, 0, 0);
  return fechaBolivia;
};

// Función para formatear fecha para mostrar - SIN MODIFICAR LA FECHA
const formatDateForDisplay = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    // Usar directamente la fecha sin conversiones UTC
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return typeof dateInput === 'string' ? dateInput.substring(0, 10) : "Fecha inválida";
  }
};

// Función para formatear hora para mostrar - SIN MODIFICAR LA HORA
const formatTimeForDisplay = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    // Usar directamente la hora sin conversiones UTC
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

// Función auxiliar para descargar archivo
const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function VentasView() {
  const currentUser = getCurrentUser();
  const userRole = getUserRole() || "admin";
  const username = currentUser?.usuario || "";
  const userBodegaId = getUserBodega();
  const isAssistant = userRole === "Asistente";
  
  // Configurar fecha actual de Bolivia por defecto
  const [fechaBoliviaHoy] = useState(() => getFechaBolivia());
  
  const [empleadosOptions, setEmpleadosOptions] = useState<UsuarioOption[]>([{ value: "Todos", label: "Todos", username: "" }]);
  const [bodegasOptions, setBodegasOptions] = useState<BodegaOption[]>([]);
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([]);
  const [totales, setTotales] = useState<TotalesVentas>({ totalGeneral: 0, totalEfectivo: 0, totalQR: 0 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  // Estados para filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [filtroMetodo, setFiltroMetodo] = useState("Todos");
  const [filtroBodega, setFiltroBodega] = useState<number | "todos">("todos");
  
  // Estados para fecha específica
  const [fechaBusqueda, setFechaBusqueda] = useState<Date | undefined>(fechaBoliviaHoy);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  
  // Estados para rango de fechas
  const [fechaRangoTemp, setFechaRangoTemp] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [fechaRangoAplicado, setFechaRangoAplicado] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [mostrarRango, setMostrarRango] = useState(false);
  
  // Estados para detalle de venta
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [mostrarDetallesImpresion, setMostrarDetallesImpresion] = useState<boolean>(true);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Efecto para buscar datos cuando cambian los filtros
  useEffect(() => {
    if (datosCargados) {
      buscarDatos();
    }
  }, [filtroEmpleado, filtroMetodo, filtroBodega, fechaBusqueda, fechaRangoAplicado, datosCargados]);

  const cargarDatosIniciales = async () => {
    try {
      setInitialLoading(true);
      setDatosCargados(false);
      setError(null);

      // Cargar bodegas para el filtro (solo admin)
      if (!isAssistant) {
        try {
          const bodegas = await getBodegas();
          const opcionesBodegas: BodegaOption[] = bodegas.map(b => ({
            value: b.idbodega,
            label: b.nombre
          }));
          setBodegasOptions(opcionesBodegas);
          
          // Si el admin tiene una bodega asignada, seleccionarla por defecto
          if (userBodegaId) {
            setFiltroBodega(userBodegaId);
          }
        } catch (err) {
          console.error("Error cargando bodegas:", err);
        }
      }

      // Cargar usuarios para el filtro de empleados (solo admin)
      if (!isAssistant) {
        const usuariosBackend: BackendUsuario[] = await getUsuariosVentas();
        const opcionesUsuarios: UsuarioOption[] = usuariosBackend.map(user => ({
          value: user.usuario,
          label: `${user.nombres} ${user.apellidos}`,
          username: user.usuario
        }));
        setEmpleadosOptions([{ value: "Todos", label: "Todos", username: "" }, ...opcionesUsuarios]);
      } else {
        setEmpleadosOptions([{ 
          value: currentUser.usuario, 
          label: `${currentUser.nombres} ${currentUser.apellidos}`, 
          username: currentUser.usuario 
        }]);
        setFiltroEmpleado(currentUser.usuario);
      }

      // Marcar que los datos iniciales están cargados
      setDatosCargados(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos");
      console.error("Error cargando datos:", err);
      setInitialLoading(false);
    }
  };

  // Función principal para buscar datos con los filtros actuales
  const buscarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let ventas: Venta[] = [];
      let totalesData: TotalesVentas = { totalGeneral: 0, totalEfectivo: 0, totalQR: 0 };

      if (isAssistant) {
        // Para asistentes: obtener ventas con filtros de fecha
        const filtros: VentasFiltros = {
          empleado: username,
          metodo: filtroMetodo !== "Todos" ? filtroMetodo : undefined,
          fechaEspecifica: fechaBusqueda,
          fechaInicio: fechaRangoAplicado.from,
          fechaFin: fechaRangoAplicado.to
        };
        
        ventas = await getVentas(filtros);
        
        // Calcular totales para asistentes
        const totalGeneral = ventas.reduce((sum, venta) => sum + venta.total, 0);
        const totalEfectivo = ventas.filter(v => v.metodo === "Efectivo").reduce((sum, venta) => sum + venta.total, 0);
        const totalQR = ventas.filter(v => v.metodo === "QR").reduce((sum, venta) => sum + venta.total, 0);
        totalesData = { totalGeneral, totalEfectivo, totalQR };
      } else {
        // Para admin: aplicar filtros normales + bodega
        const filtros: VentasFiltros = {
          empleado: filtroEmpleado !== "Todos" ? filtroEmpleado : undefined,
          metodo: filtroMetodo !== "Todos" ? filtroMetodo : undefined,
          bodega: filtroBodega !== "todos" ? filtroBodega : undefined,
          fechaEspecifica: fechaBusqueda,
          fechaInicio: fechaRangoAplicado.from,
          fechaFin: fechaRangoAplicado.to
        };
        
        ventas = await getVentas(filtros);
        totalesData = await getTotalesVentas(filtros);
      }

      setVentasFiltradas(ventas);
      setTotales(totalesData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las ventas");
      console.error("Error cargando ventas:", err);
      setVentasFiltradas([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleExportarPDF = async () => {
    try {
      setGenerandoPDF(true);
      
      // Calcular nombre del archivo basado en filtros
      let nombreArchivo = "reporte_ventas";
      
      if (fechaBusqueda) {
        const fechaStr = format(fechaBusqueda, "dd-MM-yyyy");
        nombreArchivo = `reporte_ventas_${fechaStr}`;
      } else if (fechaRangoAplicado.from && fechaRangoAplicado.to) {
        const fromStr = format(fechaRangoAplicado.from, "dd-MM-yyyy");
        const toStr = format(fechaRangoAplicado.to, "dd-MM-yyyy");
        nombreArchivo = `reporte_ventas_${fromStr}_a_${toStr}`;
      }
      
      if (filtroEmpleado !== "Todos") {
        const empleadoLabel = empleadosOptions.find(e => e.value === filtroEmpleado)?.label || filtroEmpleado;
        const empleadoLabelStr = String(empleadoLabel);
        nombreArchivo += `_${empleadoLabelStr.replace(/\s+/g, '_')}`;
      }
      
      if (filtroMetodo !== "Todos") {
        nombreArchivo += `_${filtroMetodo}`;
      }
      
      if (filtroBodega !== "todos") {
        const bodegaLabel = bodegasOptions.find(b => b.value === filtroBodega)?.label || String(filtroBodega);
        const bodegaLabelStr = String(bodegaLabel);
        nombreArchivo += `_${bodegaLabelStr.replace(/\s+/g, '_')}`;
      }
      
      nombreArchivo += ".pdf";
      
      // Crear el documento PDF
      const pdfDocument = (
        <VentasTablaPDF
          ventas={ventasFiltradas}
          filtros={{
            fechaBusqueda,
            fechaRango: fechaRangoAplicado,
            filtroEmpleado,
            filtroMetodo,
            empleadosOptions,
            userRole,
            currentUserName: currentUser ? `${currentUser.nombres} ${currentUser.apellidos}` : "Usuario",
          }}
          totales={totales}
        />
      );
      
      const pdfBlob = await pdf(pdfDocument).toBlob();
      downloadPDF(pdfBlob, nombreArchivo);
      
    } catch (error) {
      console.error("Error generando PDF:", error);
      setError("Error al generar el PDF. Por favor, intente nuevamente.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const limpiarFiltros = () => {
    const hoyBolivia = getFechaBolivia();
    setFechaBusqueda(hoyBolivia);
    setFechaRangoTemp({ from: undefined, to: undefined });
    setFechaRangoAplicado({ from: undefined, to: undefined });
    
    if (userRole === "Admin") {
      setFiltroEmpleado("Todos");
      if (userBodegaId) {
        setFiltroBodega(userBodegaId);
      } else {
        setFiltroBodega("todos");
      }
    } else {
      setFiltroEmpleado(currentUser.usuario);
    }
    
    setFiltroMetodo("Todos");
  };

  const handleFechaBusquedaChange = async (date: Date | undefined) => {
    if (date) {
      setFechaBusqueda(date);
      setFechaRangoAplicado({ from: undefined, to: undefined });
      setFechaRangoTemp({ from: undefined, to: undefined });
      setMostrarCalendario(false);
    }
  };

  const handleRangoTempChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFechaRangoTemp(range);
  };

  const aplicarRangoFechas = async () => {
    if (fechaRangoTemp.from && fechaRangoTemp.to) {
      setFechaRangoAplicado({
        from: fechaRangoTemp.from,
        to: fechaRangoTemp.to
      });
      setFechaBusqueda(undefined);
      setMostrarRango(false);
    }
  };

  const cancelarRangoFechas = () => {
    setFechaRangoTemp({
      from: fechaRangoAplicado.from,
      to: fechaRangoAplicado.to
    });
    setMostrarRango(false);
  };

  const abrirDetalleVenta = (venta: Venta, imprimir: boolean = true) => {
    setMostrarDetallesImpresion(imprimir);
    setVentaSeleccionada(venta);
    setMostrarDetalle(true);
  };

  const imprimirDetalle = () => {
    if (ventaSeleccionada) {
      const nombreCliente = ventaSeleccionada.cliente || "No especificado";
      
      generateVentaPDF({
        venta: ventaSeleccionada,
        nombreCliente,
        fileName: `Venta_${ventaSeleccionada.id}_${nombreCliente.replace(/\s+/g, '_')}.pdf`
      });
    }
  };

  const getBodegaNombre = () => {
    if (userBodegaId) {
      const bodega = bodegasOptions.find(b => b.value === userBodegaId);
      return bodega?.label || "No asignada";
    }
    return "No asignada";
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos de ventas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Historial de Ventas</h1>
        <Button 
          onClick={handleExportarPDF} 
          disabled={ventasFiltradas.length === 0 || generandoPDF}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          {generandoPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cards de totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Bs {totales.totalGeneral.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs {totales.totalEfectivo.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total QR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Bs {totales.totalQR.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {!isAssistant && (
              <div>
                <label className="text-sm font-medium">Empleado</label>
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {empleadosOptions.map(empleado => (
                      <SelectItem key={empleado.value} value={empleado.value}>
                        {empleado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Método de Pago</label>
              <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="QR">QR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isAssistant && (
              <div>
                <label className="text-sm font-medium">Sucursal</label>
                <Select 
                  value={filtroBodega === "todos" ? "todos" : String(filtroBodega)} 
                  onValueChange={(value) => setFiltroBodega(value === "todos" ? "todos" : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las sucursales</SelectItem>
                    {bodegasOptions.map(bodega => (
                      <SelectItem key={bodega.value} value={String(bodega.value)}>
                        {bodega.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Fecha Específica</label>
              <Popover open={mostrarCalendario} onOpenChange={setMostrarCalendario}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaBusqueda ? format(fechaBusqueda, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaBusqueda}
                    onSelect={handleFechaBusquedaChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">Rango de Fechas</label>
              <Popover open={mostrarRango} onOpenChange={setMostrarRango}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarRangeIcon className="mr-2 h-4 w-4" />
                    {fechaRangoAplicado.from && fechaRangoAplicado.to ? 
                      `${format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}` : 
                      "Seleccionar rango"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex flex-col">
                    <Calendar
                      mode="range"
                      selected={fechaRangoTemp}
                      onSelect={handleRangoTempChange}
                      numberOfMonths={1}
                      className="p-3 pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                    <div className="flex justify-end gap-2 p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelarRangoFechas}
                        disabled={!fechaRangoTemp.from && !fechaRangoTemp.to}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={aplicarRangoFechas}
                        disabled={!fechaRangoTemp.from || !fechaRangoTemp.to}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={limpiarFiltros} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
              <span>Filtros activos:</span>
              {fechaBusqueda && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Fecha: {format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}
                </span>
              )}
              {fechaRangoAplicado.from && fechaRangoAplicado.to && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Rango: {format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - {format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}
                </span>
              )}
              {!isAssistant && filtroEmpleado !== "Todos" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Empleado: {empleadosOptions.find(e => e.value === filtroEmpleado)?.label}
                </span>
              )}
              {filtroMetodo !== "Todos" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Método: {filtroMetodo}
                </span>
              )}
              {!isAssistant && filtroBodega !== "todos" && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Sucursal: {bodegasOptions.find(b => b.value === filtroBodega)?.label}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isAssistant && (
        <div className="text-xs text-muted-foreground -mt-4">
          <p>Mostrando tus ventas con los filtros aplicados</p>
        </div>
      )}

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Registro de Ventas 
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({ventasFiltradas.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Cargando ventas...</span>
            </div>
          ) : (
            <div className="block md:overflow-x-auto">
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="w-[140px]">Fecha y Hora</TableHead>
                    <TableHead className="w-[150px]">Usuario</TableHead>
                    {!isAssistant && <TableHead className="w-[130px]">Sucursal</TableHead>}
                    <TableHead className="w-[150px]">Cliente</TableHead>
                    <TableHead className="min-w-[300px]">Descripción</TableHead>
                    <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                    <TableHead className="w-[100px] text-right">Descuento</TableHead>
                    <TableHead className="w-[130px] text-right">Total</TableHead>
                    <TableHead className="w-[120px]">Método</TableHead>
                    <TableHead className="w-[140px]">Impresión</TableHead>
                    <TableHead className="w-[50px]">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <p className="text-muted-foreground mb-2">No se encontraron ventas</p>
                          <p className="text-sm text-muted-foreground">
                            {fechaBusqueda && `Para la fecha: ${format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}`}
                            {fechaRangoAplicado.from && fechaRangoAplicado.to && 
                              `En el rango: ${format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}`}
                            {!isAssistant && filtroEmpleado !== "Todos" && ` - Empleado: ${empleadosOptions.find(e => e.value === filtroEmpleado)?.label}`}
                            {filtroMetodo !== "Todos" && ` - Método: ${filtroMetodo}`}
                            {!isAssistant && filtroBodega !== "todos" && ` - Sucursal: ${bodegasOptions.find(b => b.value === filtroBodega)?.label}`}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventasFiltradas.map((venta) => (
                      <TableRow key={venta.id} className="md:table-row block border-b p-4 md:p-0">
                        {/* Fecha y Hora - SIN MODIFICAR */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="font-medium">
                            {formatDateForDisplay(venta.fecha)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimeForDisplay(venta.fecha)}
                          </div>
                        </TableCell>
                        
                        {/* Usuario */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">USUARIO</div>
                          <div className="font-medium">
                            {venta.usuario}
                          </div>
                        </TableCell>
                        
                        {/* Sucursal - Solo para Admin */}
                        {!isAssistant && (
                          <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                            <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">SUCURSAL</div>
                            <div className="text-sm">
                              {venta.bodegaNombre || "N/A"}
                            </div>
                          </TableCell>
                        )}
                        
                        {/* Cliente */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">CLIENTE</div>
                          <div className="text-sm font-medium">
                            {venta.cliente || "No especificado"}
                          </div>
                        </TableCell>
                        
                        {/* Descripción */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCRIPCIÓN</div>
                          <div className="text-sm leading-relaxed">
                            {venta.descripcion}
                          </div>
                          {venta.descripcion_descuento && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Descuento: {venta.descripcion_descuento}
                            </div>
                          )}
                        </TableCell>
                        
                        {/* Subtotal */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">SUBTOTAL</div>
                          <div className="text-right md:text-right">
                            Bs {venta.subtotal.toFixed(2)}
                          </div>
                        </TableCell>
                        
                        {/* Descuento */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCUENTO</div>
                          <div className="text-right md:text-right">
                            Bs {venta.descuento.toFixed(2)}
                          </div>
                        </TableCell>
                        
                        {/* Total */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0 font-medium">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TOTAL</div>
                          <div className="text-lg font-bold text-primary text-right md:text-right md:pr-4">
                            Bs {venta.total.toFixed(2)}
                          </div>
                        </TableCell>
                        
                        {/* Método de Pago */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MÉTODO</div>
                          <div className="flex justify-start md:justify-start md:pl-4">
                            <Badge variant={venta.metodo === "Efectivo" ? "default" : "secondary"}>
                              {venta.metodo}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        {/* Impresión */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">IMPRESIÓN</div>
                          <div className="flex justify-start md:justify-start">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => abrirDetalleVenta(venta)}
                              className="flex items-center gap-2"
                            >
                              <Printer className="h-4 w-4" />
                              <span className="hidden sm:inline">Imprimir</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                          <div className="flex justify-start md:justify-start">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => abrirDetalleVenta(venta, false)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para detalle de venta */}
      <Dialog open={mostrarDetalle} onOpenChange={setMostrarDetalle}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
          </DialogHeader>

          <div id="detalle-venta-imprimir" className="space-y-6">
            {mostrarDetallesImpresion && (
              <div className="logo text-center mb-6">
                <img 
                  src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" 
                  alt="Lumyla Logo" 
                  className="h-16 mx-auto"
                />
              </div>
            )}

            <div className="info-cliente space-y-2">
              {mostrarDetallesImpresion && ventaSeleccionada && (
                <p><strong>Cliente:</strong> {ventaSeleccionada.cliente || "No especificado"}</p>
              )}
              <p><strong>Fecha:</strong> {ventaSeleccionada ? `${formatDateForDisplay(ventaSeleccionada.fecha)} ${formatTimeForDisplay(ventaSeleccionada.fecha)}` : ""}</p>
              <p><strong>Dirección:</strong> Av. Heroinas esq. Hamiraya #316</p>
              <p><strong>Números:</strong> 77950297 - 77918672</p>
              {ventaSeleccionada?.bodegaNombre && (
                <p><strong>Sucursal:</strong> {ventaSeleccionada.bodegaNombre}</p>
              )}
              <p><strong>Vendedor:</strong> {ventaSeleccionada?.usuario}</p>
            </div>

            <div className="descripcion-venta bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Descripción de la Venta:</h3>
              <p className="text-sm">{ventaSeleccionada?.descripcion}</p>
              {ventaSeleccionada?.descripcion_descuento && (
                <div className="mt-2">
                  <h3 className="font-semibold mb-1">Descripción del descuento:</h3>
                  <p className="text-sm">{ventaSeleccionada?.descripcion_descuento}</p>
                </div>
              )}
            </div>

            {ventaSeleccionada?.detalle && ventaSeleccionada.detalle.length > 0 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Productos:</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventaSeleccionada.detalle.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.producto}</TableCell>
                          <TableCell>Bs {item.precio_unitario.toFixed(2)}</TableCell>
                          <TableCell>{item.cantidad}</TableCell>
                          <TableCell>Bs {(item.precio_unitario * item.cantidad).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="totales w-full lg:w-48">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Subtotal:</TableCell>
                        <TableCell>Bs {ventaSeleccionada?.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Descuento:</TableCell>
                        <TableCell>Bs {ventaSeleccionada?.descuento.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold">Total:</TableCell>
                        <TableCell className="font-bold">Bs {ventaSeleccionada?.total.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {mostrarDetallesImpresion && (
            <div className="flex justify-end mt-6">
              <Button onClick={imprimirDetalle} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}