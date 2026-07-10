// src/components/dashboard/CajaView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, CalendarRange as CalendarRangeIcon, Loader2, Check, X, Plus, DollarSign, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  getTransaccionesCaja,
  TransaccionCaja
} from "@/api/CajaApi";
import { RegistraMovimientoView } from "./RegistraMovimientoView";

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

// Función para formatear fecha para mostrar (sin conversiones UTC)
const formatDateForDisplay = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return typeof dateInput === 'string' ? dateInput.substring(0, 10) : "Fecha inválida";
  }
};

// Función para formatear hora para mostrar (sin conversiones UTC)
const formatTimeForDisplay = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedHours = hours < 10 ? `0${hours}` : hours.toString();
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
    return `${formattedHours}:${formattedMinutes}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

// Datos mock para pruebas
const MOCK_SALDO = {
  monto_final: "1500.00",
  estado: "cerrada"
};

export function CajaView() {
  // Obtener usuario real
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.rol?.toLowerCase() || "admin";
  const currentUserName = currentUser?.nombres && currentUser?.apellidos 
    ? `${currentUser.nombres} ${currentUser.apellidos}` 
    : currentUser?.usuario || "Usuario";
  const isAdmin = userRole === "admin";
  const isAssistant = userRole === "asistente";
  
  // Configurar fecha actual de Bolivia por defecto
  const [fechaBoliviaHoy] = useState(() => getFechaBolivia());
  
  const [empleadosOptions, setEmpleadosOptions] = useState<{ value: string; label: string }[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<TransaccionCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [saldoActual, setSaldoActual] = useState<number>(1500);
  const [estadoCaja, setEstadoCaja] = useState<string>("cerrada");
  const [tipoCajaSeleccionado, setTipoCajaSeleccionado] = useState<"Efectivo" | "QR" | "">("");
  
  // Estado para controlar el diálogo de registro de movimiento
  const [showRegistroMovimiento, setShowRegistroMovimiento] = useState(false);
  
  // Estados para filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  
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

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Efecto para buscar datos cuando cambian los filtros O el tipo de caja seleccionado
  useEffect(() => {
    if (datosCargados) {
      buscarDatos();
    }
  }, [filtroEmpleado, fechaBusqueda, fechaRangoAplicado, datosCargados, tipoCajaSeleccionado]);

  const cargarDatosIniciales = async () => {
    try {
      setInitialLoading(true);
      setDatosCargados(false);
      setError(null);

      // Usar datos mock
      setSaldoActual(parseFloat(MOCK_SALDO.monto_final));
      setEstadoCaja(MOCK_SALDO.estado);
      
      // Cargar usuarios mock
      const usuariosList = ["Usuario Prueba", "Admin Test", "Asistente Test"];
      const opcionesUsuarios = usuariosList.map(user => ({
        value: user,
        label: user
      }));
      
      // Si es asistente, solo mostrar su nombre y seleccionarlo automáticamente
      if (isAssistant) {
        const opcionesFiltradas = [{ value: currentUserName, label: currentUserName }];
        setEmpleadosOptions(opcionesFiltradas);
        setFiltroEmpleado(currentUserName);
      } else {
        setEmpleadosOptions([{ value: "Todos", label: "Todos" }, ...opcionesUsuarios]);
        setFiltroEmpleado("Todos");
      }

      // Marcar que los datos iniciales están cargados
      setDatosCargados(true);
      setInitialLoading(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos");
      console.error("Error cargando datos:", err);
      setInitialLoading(false);
    }
  };

  const buscarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Si no hay tipo de caja seleccionado, mostrar vacío
      if (!tipoCajaSeleccionado) {
        setMovimientosCaja([]);
        setLoading(false);
        return;
      }

      const params: {
        idusuario?: number;
        fecha?: string;
        fechaInicio?: string;
        fechaFin?: string;
        tipoCaja: string;
      } = {tipoCaja : tipoCajaSeleccionado};

      if (isAssistant) {
        params.idusuario = currentUser?.idUsuario;
      }
      else if (isAdmin && filtroEmpleado !== "Todos") {
        params.idusuario = Number(filtroEmpleado);
      }
      
      if (fechaBusqueda) {
        params.fecha = format(fechaBusqueda, "yyyy-MM-dd");
      }

      if (fechaRangoAplicado.from && fechaRangoAplicado.to) {
        params.fechaInicio = format(fechaRangoAplicado.from, "yyyy-MM-dd");
        params.fechaFin = format(fechaRangoAplicado.to, "yyyy-MM-dd");
        delete params.fecha;
      }

      const transacciones = await getTransaccionesCaja(params);

      setMovimientosCaja(transacciones);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los movimientos");
      console.error("Error cargando movimientos:", err);
      setMovimientosCaja([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarMovimiento = () => {
    setShowRegistroMovimiento(true);
  };

  const handleCloseRegistroMovimiento = () => {
    setShowRegistroMovimiento(false);
    // Recargar movimientos después de cerrar
    buscarDatos();
  };

  const limpiarFiltros = () => {
    const hoyBolivia = getFechaBolivia();
    setFechaBusqueda(hoyBolivia);
    setFechaRangoTemp({ from: undefined, to: undefined });
    setFechaRangoAplicado({ from: undefined, to: undefined });
    if (isAssistant) {
      setFiltroEmpleado(currentUserName);
    } else {
      setFiltroEmpleado("Todos");
    }
  };

  // Manejar cambio en filtro de fecha específica
  const handleFechaBusquedaChange = async (date: Date | undefined) => {
    if (date) {
      setFechaBusqueda(date);
      setFechaRangoAplicado({ from: undefined, to: undefined });
      setFechaRangoTemp({ from: undefined, to: undefined });
      setMostrarCalendario(false);
    }
  };

  // Manejar cambio temporal en filtro de rango de fechas
  const handleRangoTempChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFechaRangoTemp(range);
  };

  // Aplicar rango seleccionado
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

  // Cancelar selección de rango
  const cancelarRangoFechas = () => {
    setFechaRangoTemp({
      from: fechaRangoAplicado.from,
      to: fechaRangoAplicado.to
    });
    setMostrarRango(false);
  };

  // Calcular totales de los movimientos
  const totalIngresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "Ingreso" || mov.tipo_movimiento === "Apertura")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const totalEgresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "Egreso" || mov.tipo_movimiento === "Cierre")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const saldoFiltrado = totalIngresos - totalEgresos;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos de caja...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Gestión de Caja</h1>
        {/* Botón Registrar Movimiento - Solo visible para Asistente */}
        {isAssistant && (
          <Button 
            onClick={handleRegistrarMovimiento}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Registrar Movimiento
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cards de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs {totalEgresos.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              En los movimientos mostrados
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs {totalIngresos.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              En los movimientos mostrados
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-1">
              Estado: <span className={`font-medium ${estadoCaja === 'abierta' ? 'text-green-600' : 'text-red-600'}`}>
                {estadoCaja === 'abierta' ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>
            <div className={`text-2xl font-bold ${saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Bs {saldoActual.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Saldo filtrado: <span className={`font-medium ${saldoFiltrado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Bs {saldoFiltrado.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card para seleccionar el tipo de caja a visualizar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Seleccionar Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={tipoCajaSeleccionado === "Efectivo" ? "default" : "outline"}
                className="flex items-center gap-2 h-12"
                onClick={() => setTipoCajaSeleccionado("Efectivo")}
              >
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Efectivo</span>
              </Button>
              <Button
                variant={tipoCajaSeleccionado === "QR" ? "default" : "outline"}
                className="flex items-center gap-2 h-12"
                onClick={() => setTipoCajaSeleccionado("QR")}
              >
                <Building2 className="h-4 w-4" />
                <span className="text-sm">QR</span>
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              {tipoCajaSeleccionado ? `Viendo: ${tipoCajaSeleccionado}` : 'Selecciona una caja para ver sus movimientos'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros - Admin ve todos los filtros, Asistente solo ve filtros de fecha */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Filtro de Empleado - Solo visible para Admin */}
            {isAdmin && (
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

            {/* Filtros de fecha - Visibles para TODOS */}
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
                      "Seleccionar rango"}
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
          
          {/* Indicador de filtros activos */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
              <span>Filtros activos:</span>
              {tipoCajaSeleccionado && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Caja: {tipoCajaSeleccionado}
                </span>
              )}
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
              {isAdmin && filtroEmpleado !== "Todos" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Empleado: {filtroEmpleado}
                </span>
              )}
              {!tipoCajaSeleccionado && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                  Sin caja seleccionada
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información para asistentes */}
      {isAssistant && (
        <div className="text-xs text-muted-foreground -mt-2">
          <p>Mostrando tus movimientos de caja</p>
        </div>
      )}

      {/* Tabla de movimientos de caja */}
      <Card>
        <CardHeader>
          <CardTitle>
            Movimientos de Caja {tipoCajaSeleccionado ? `- ${tipoCajaSeleccionado}` : ''}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({movimientosCaja.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Cargando movimientos...</span>
            </div>
          ) : (
            <div className="block md:overflow-x-auto">
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="w-[140px]">Fecha y Hora</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="min-w-[300px]">Descripción</TableHead>
                    {isAdmin && <TableHead className="w-[150px]">Empleado</TableHead>}
                    <TableHead className="w-[130px] text-right">Monto (Bs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tipoCajaSeleccionado ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <p className="text-muted-foreground mb-2">Selecciona un tipo de caja para ver sus movimientos</p>
                          <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setTipoCajaSeleccionado("Efectivo")}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Efectivo
                            </Button>
                            <Button variant="outline" onClick={() => setTipoCajaSeleccionado("QR")}>
                              <Building2 className="h-4 w-4 mr-2" />
                              QR
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : movimientosCaja.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <p className="text-muted-foreground mb-2">No se encontraron movimientos para {tipoCajaSeleccionado}</p>
                          <p className="text-sm text-muted-foreground">
                            {fechaBusqueda && `Para la fecha: ${format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}`}
                            {fechaRangoAplicado.from && fechaRangoAplicado.to && 
                              `En el rango: ${format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}`}
                            {isAdmin && filtroEmpleado !== "Todos" && ` - Empleado: ${filtroEmpleado}`}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientosCaja.map((movimiento) => (
                      <TableRow key={movimiento.idtransaccion} className="md:table-row block border-b p-4 md:p-0">
                        {/* Fecha y Hora */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="font-medium">
                            {formatDateForDisplay(movimiento.fecha)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimeForDisplay(movimiento.fecha)}
                          </div>
                        </TableCell>
                        
                        {/* Tipo */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TIPO</div>
                          <div className="flex justify-start md:justify-start">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipo_movimiento === "Ingreso" || movimiento.tipo_movimiento === "Apertura"
                                ? "bg-green-100 text-green-800" 
                                : movimiento.tipo_movimiento === "Cierre"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {movimiento.tipo_movimiento}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Descripción */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCRIPCIÓN</div>
                          <div className="text-sm leading-relaxed">
                            {movimiento.descripcion}
                          </div>
                        </TableCell>
                        
                        {/* Empleado - Solo para Admin */}
                        {isAdmin && (
                          <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                            <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">EMPLEADO</div>
                            <div className="text-sm">
                              {movimiento.empleado}
                            </div>
                          </TableCell>
                        )}
                        
                        {/* Monto */}
                        <TableCell className={`md:table-cell block md:border-0 border-0 p-0 font-medium ${
                          movimiento.tipo_movimiento === "Ingreso" || movimiento.tipo_movimiento === "Apertura" ? "text-green-600" : 
                          movimiento.tipo_movimiento === "Cierre" ? "text-blue-600" : "text-red-600"
                        }`}>
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MONTO</div>
                          <div className="text-lg font-bold text-right md:text-right">
                            {movimiento.tipo_movimiento === "Egreso" || movimiento.tipo_movimiento === "Cierre" ? "-" : ""}Bs {movimiento.monto.toFixed(2)}
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

      {/* Diálogo para registrar movimiento - Solo visible para Asistente */}
      {isAssistant && showRegistroMovimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg p-6">
            <button
              onClick={handleCloseRegistroMovimiento}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
            <RegistraMovimientoView 
              onClose={handleCloseRegistroMovimiento}
            />
          </div>
        </div>
      )}
    </div>
  );
}