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
  getUsuariosCaja,
  getSaldoActual,
  getBodegas,
  TransaccionCaja,
  Bodega
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

// Función para formatear fecha para mostrar
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

// Función para formatear hora para mostrar
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

export function CajaView() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.rol?.toLowerCase() || "admin";
  const currentUserName = currentUser?.nombres && currentUser?.apellidos 
    ? `${currentUser.nombres} ${currentUser.apellidos}` 
    : currentUser?.usuario || "Usuario";
  const isAdmin = userRole === "admin";
  const isAssistant = userRole === "asistente";
  
  const [fechaBoliviaHoy] = useState(() => getFechaBolivia());
  
  const [empleadosOptions, setEmpleadosOptions] = useState<{ value: string; label: string }[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<TransaccionCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [estadoCaja, setEstadoCaja] = useState<string>("cerrada");
  const [tipoCajaSeleccionado, setTipoCajaSeleccionado] = useState<"Efectivo" | "QR" | "">("");
  
  // Estado para bodegas
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [selectedBodega, setSelectedBodega] = useState<number | null>(null);
  const [loadingBodegas, setLoadingBodegas] = useState(false);
  
  const [showRegistroMovimiento, setShowRegistroMovimiento] = useState(false);
  
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  
  const [fechaBusqueda, setFechaBusqueda] = useState<Date | undefined>(fechaBoliviaHoy);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  
  const [fechaRangoTemp, setFechaRangoTemp] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [fechaRangoAplicado, setFechaRangoAplicado] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [mostrarRango, setMostrarRango] = useState(false);

  // Cargar bodegas al inicio
  useEffect(() => {
    const cargarBodegas = async () => {
      setLoadingBodegas(true);
      try {
        const bodegasData = await getBodegas();
        setBodegas(bodegasData);
        // Seleccionar la primera bodega por defecto
        if (bodegasData.length > 0 && selectedBodega === null) {
          // Buscar la bodega del usuario actual si existe
          const userBodegaId = currentUser?.idbodega;
          if (userBodegaId && bodegasData.some(b => b.idbodega === userBodegaId)) {
            setSelectedBodega(userBodegaId);
          } else {
            setSelectedBodega(bodegasData[0].idbodega);
          }
        }
      } catch (error) {
        console.error("Error cargando bodegas:", error);
      } finally {
        setLoadingBodegas(false);
      }
    };
    cargarBodegas();
  }, []);

  useEffect(() => {
    cargarDatosIniciales();
  }, [tipoCajaSeleccionado, selectedBodega]);

  useEffect(() => {
    if (datosCargados) {
      buscarDatos();
    }
  }, [filtroEmpleado, fechaBusqueda, fechaRangoAplicado, datosCargados, tipoCajaSeleccionado, selectedBodega]);

  const cargarDatosIniciales = async () => {
    try {
      setInitialLoading(true);
      setDatosCargados(false);
      setError(null);

      if (tipoCajaSeleccionado && selectedBodega) {
        try {
          const params: { idbodega: number; tipoCaja: string } = { 
            idbodega: selectedBodega, 
            tipoCaja: tipoCajaSeleccionado
          };
          const saldoData = await getSaldoActual(params);
          setSaldoActual(parseFloat(saldoData.monto_final));
          // Solo mostrar estado si es Efectivo
          if (tipoCajaSeleccionado === "Efectivo") {
            setEstadoCaja(saldoData.estado);
          } else {
            setEstadoCaja(""); // QR no tiene estado
          }
        } catch (saldoError) {
          console.error("Error cargando saldo:", saldoError);
          setSaldoActual(0);
          setEstadoCaja("");
        }
      } else {
        setSaldoActual(0);
        setEstadoCaja("");
      }
      
      try {
        const usuarios = await getUsuariosCaja();
        const opcionesUsuarios = usuarios.map(usuario => ({
          value: usuario.idusuario.toString(),
          label: usuario.empleado_nombre
        }));
        
        if (isAssistant) {
          const usuarioActual = usuarios.find(u => 
            u.empleado_nombre === currentUserName || 
            u.idusuario === currentUser?.idUsuario
          );
          
          if (usuarioActual) {
            const opcionesFiltradas = [{ 
              value: usuarioActual.idusuario.toString(), 
              label: usuarioActual.empleado_nombre 
            }];
            setEmpleadosOptions(opcionesFiltradas);
            setFiltroEmpleado(usuarioActual.idusuario.toString());
          } else {
            const opcionesFiltradas = [{ value: currentUser.idUsuario, label: currentUserName }];
            setEmpleadosOptions(opcionesFiltradas);
            setFiltroEmpleado(currentUserName);
          }
        } else {
          const opcionesCompletas = [
            { value: "Todos", label: "Todos" }, 
            ...opcionesUsuarios
          ];
          setEmpleadosOptions(opcionesCompletas);
          setFiltroEmpleado("Todos");
        }
      } catch (usuariosError) {
        console.error("Error cargando usuarios:", usuariosError);
        if (isAssistant) {
          setEmpleadosOptions([{ value: currentUserName, label: currentUserName }]);
          setFiltroEmpleado(currentUserName);
        } else {
          setEmpleadosOptions([{ value: "Todos", label: "Todos" }]);
          setFiltroEmpleado("Todos");
        }
      }
      
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

      if (!tipoCajaSeleccionado || !selectedBodega) {
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
        idbodega: number;
      } = { 
        tipoCaja: tipoCajaSeleccionado,
        idbodega: selectedBodega
      };

      if (isAssistant) {
        if (currentUser?.idUsuario) {
          params.idusuario = currentUser.idUsuario;
        } else {
          const usuario = empleadosOptions.find(u => u.label === currentUserName);
          if (usuario && usuario.value !== "Todos") {
            params.idusuario = parseInt(usuario.value);
          }
        }
      } else if (isAdmin && filtroEmpleado !== "Todos") {
        params.idusuario = parseInt(filtroEmpleado);
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

  // Función para recargar todos los datos después de una transacción
  const recargarDatosCompletos = async () => {
    await cargarDatosIniciales();
    await buscarDatos();
  };

  const handleRegistrarMovimiento = () => {
    setShowRegistroMovimiento(true);
  };

  const handleCloseRegistroMovimiento = () => {
    setShowRegistroMovimiento(false);
    // Recargar datos al cerrar el modal
    recargarDatosCompletos();
  };

  const limpiarFiltros = () => {
    const hoyBolivia = getFechaBolivia();
    setFechaBusqueda(hoyBolivia);
    setFechaRangoTemp({ from: undefined, to: undefined });
    setFechaRangoAplicado({ from: undefined, to: undefined });
    if (isAssistant) {
      const usuarioActual = empleadosOptions.find(u => u.label === currentUserName);
      if (usuarioActual) {
        setFiltroEmpleado(usuarioActual.value);
      } else {
        setFiltroEmpleado(currentUserName);
      }
    } else {
      setFiltroEmpleado("Todos");
    }
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

  const totalIngresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "ingreso" || mov.tipo_movimiento === "apertura")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const totalEgresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "egreso" || mov.tipo_movimiento === "cierre")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const saldoFiltrado = totalIngresos - totalEgresos;

  // Obtener nombre de la bodega seleccionada
  const bodegaSeleccionada = bodegas.find(b => b.idbodega === selectedBodega);

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs {totalEgresos.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {tipoCajaSeleccionado ? 'En los movimientos mostrados' : 'Selecciona una caja'}
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
              {tipoCajaSeleccionado ? 'En los movimientos mostrados' : 'Selecciona una caja'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Solo mostrar estado si es Efectivo */}
            {tipoCajaSeleccionado === "Efectivo" && (
              <div className="text-xs text-muted-foreground mb-1">
                Estado: <span className={`font-medium ${estadoCaja === 'abierta' ? 'text-green-600' : 'text-red-600'}`}>
                  {estadoCaja === 'abierta' ? 'ABIERTA' : 'CERRADA'}
                </span>
              </div>
            )}
            <div className={`text-2xl font-bold ${saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Bs {saldoActual.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {tipoCajaSeleccionado ? (
                <>
                  Saldo filtrado: <span className={`font-medium ${saldoFiltrado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Bs {saldoFiltrado.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">Selecciona una caja para ver el saldo</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Seleccionar Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={tipoCajaSeleccionado === "Efectivo" ? "default" : "outline"}
                className={`flex items-center gap-2 h-12 ${tipoCajaSeleccionado === "Efectivo" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                onClick={() => setTipoCajaSeleccionado("Efectivo")}
              >
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Efectivo</span>
              </Button>
              <Button
                variant={tipoCajaSeleccionado === "QR" ? "default" : "outline"}
                className={`flex items-center gap-2 h-12 ${tipoCajaSeleccionado === "QR" ? "ring-2 ring-primary ring-offset-2" : ""}`}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Filtro de Bodega - SOLO PARA ADMIN */}
            {isAdmin && (
              <div>
                <label className="text-sm font-medium">Bodega</label>
                <Select 
                  value={selectedBodega?.toString() || ""} 
                  onValueChange={(value) => setSelectedBodega(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingBodegas ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : bodegas.length === 0 ? (
                      <SelectItem value="none" disabled>No hay bodegas</SelectItem>
                    ) : (
                      bodegas.map((bodega) => (
                        <SelectItem key={bodega.idbodega} value={bodega.idbodega.toString()}>
                          {bodega.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdmin && (
              <div>
                <label className="text-sm font-medium">Empleado</label>
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
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
          
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
              <span>Filtros activos:</span>
              {selectedBodega && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  Bodega: {bodegaSeleccionada?.nombre || selectedBodega}
                </span>
              )}
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
                  Empleado: {empleadosOptions.find(e => e.value === filtroEmpleado)?.label || filtroEmpleado}
                </span>
              )}
              {isAdmin && filtroEmpleado === "Todos" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Empleado: Todos
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

      {isAssistant && (
        <div className="text-xs text-muted-foreground -mt-2">
          <p>Mostrando tus movimientos de caja</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Movimientos de Caja {tipoCajaSeleccionado ? `- ${tipoCajaSeleccionado}` : ''}
            {bodegaSeleccionada && ` - ${bodegaSeleccionada.nombre}`}
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
                    {isAdmin && <TableHead className="w-[120px]">Bodega</TableHead>}
                    <TableHead className="w-[130px] text-right">Monto (Bs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tipoCajaSeleccionado ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8">
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
                      <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <p className="text-muted-foreground mb-2">No se encontraron movimientos para {tipoCajaSeleccionado}</p>
                          <p className="text-sm text-muted-foreground">
                            {bodegaSeleccionada && `Bodega: ${bodegaSeleccionada.nombre}`}
                            {fechaBusqueda && ` - Fecha: ${format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}`}
                            {fechaRangoAplicado.from && fechaRangoAplicado.to && 
                              ` - Rango: ${format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}`}
                            {isAdmin && filtroEmpleado !== "Todos" && ` - Empleado: ${empleadosOptions.find(e => e.value === filtroEmpleado)?.label || filtroEmpleado}`}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientosCaja.map((movimiento) => (
                      <TableRow key={movimiento.idtransaccion} className="md:table-row block border-b p-4 md:p-0">
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="font-medium">
                            {formatDateForDisplay(movimiento.fecha)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimeForDisplay(movimiento.fecha)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TIPO</div>
                          <div className="flex justify-start md:justify-start">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipo_movimiento === "ingreso" || movimiento.tipo_movimiento === "apertura"
                                ? "bg-green-100 text-green-800" 
                                : movimiento.tipo_movimiento === "cierre"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {movimiento.tipo_movimiento === "ingreso" ? "Ingreso" :
                               movimiento.tipo_movimiento === "egreso" ? "Egreso" :
                               movimiento.tipo_movimiento === "apertura" ? "Apertura" :
                               movimiento.tipo_movimiento === "cierre" ? "Cierre" :
                               movimiento.tipo_movimiento}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCRIPCIÓN</div>
                          <div className="text-sm leading-relaxed">
                            {movimiento.descripcion}
                          </div>
                        </TableCell>
                        
                        {isAdmin && (
                          <>
                            <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                              <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">EMPLEADO</div>
                              <div className="text-sm">
                                {movimiento.empleado}
                              </div>
                            </TableCell>
                            <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                              <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">BODEGA</div>
                              <div className="text-sm">
                                {movimiento.bodega_nombre || "—"}
                              </div>
                            </TableCell>
                          </>
                        )}
                        
                        <TableCell className={`md:table-cell block md:border-0 border-0 p-0 font-medium ${
                          movimiento.tipo_movimiento === "ingreso" || movimiento.tipo_movimiento === "apertura" ? "text-green-600" : 
                          movimiento.tipo_movimiento === "cierre" ? "text-blue-600" : "text-red-600"
                        }`}>
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MONTO</div>
                          <div className="text-lg font-bold text-right md:text-right">
                            {movimiento.tipo_movimiento === "egreso" || movimiento.tipo_movimiento === "cierre" ? "-" : ""}Bs {movimiento.monto.toFixed(2)}
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
              onTransaccionExitosa={async () => {
                // ✅ Esta función se ejecuta después de cada transacción exitosa
                // Recargar saldo y movimientos
                await recargarDatosCompletos();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}