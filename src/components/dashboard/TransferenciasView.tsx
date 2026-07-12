// src/components/dashboard/TransferenciasView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, User, Users, DollarSign, Building2, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  getTransferencias, 
  aprobarTransferencia, 
  rechazarTransferencia,
  Transferencia 
} from "@/api/TransferenciaApi";
import { formatDateForDisplay, formatTimeForDisplay } from "./CajaView";

// Función para obtener el usuario del localStorage
const getCurrentUser = (): { idusuario: number; rol: string; nombres: string; apellidos: string } | null => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return {
      idusuario: user.idUsuario || user.idusuario || 0,
      rol: user.rol || "asistente",
      nombres: user.nombres || "",
      apellidos: user.apellidos || ""
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export function TransferenciasView() {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.rol?.toLowerCase() || "asistente";
  const userId = currentUser?.idusuario || 0;
  const isAdmin = userRole === "admin";
  const isAssistant = userRole === "asistente";

  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState<string>("");
  
  // Estados para los totales (solo frontend)
  const [totalTransferenciasEfectivo, setTotalTransferenciasEfectivo] = useState<number>(0);
  const [totalTransferenciasQR, setTotalTransferenciasQR] = useState<number>(0);
  const [totalTransferenciasPendientes, setTotalTransferenciasPendientes] = useState<number>(0);

  // Cargar transferencias desde la API
  useEffect(() => {
    if (userId > 0) {
      cargarTransferencias();
    } else {
      setLoading(false);
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario",
        variant: "destructive",
      });
    }
  }, [userId]);

  const cargarTransferencias = async () => {
    setLoading(true);
    try {
      const data = await getTransferencias(userId, userRole);
      setTransferencias(data);
      
      // Calcular totales (solo frontend)
      calcularTotales(data);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las transferencias",
        variant: "destructive",
      });
      setTransferencias([]);
      setTotalTransferenciasEfectivo(0);
      setTotalTransferenciasQR(0);
      setTotalTransferenciasPendientes(0);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular todos los totales
  const calcularTotales = (data: Transferencia[]) => {
    // Total de transferencias aprobadas en EFECTIVO
    const totalEfectivo = data
      .filter(t => t.estado === "aprobada" && t.tipo === "Efectivo")
      .reduce((sum, t) => sum + getMontoNumber(t.monto), 0);
    setTotalTransferenciasEfectivo(totalEfectivo);

    // Total de transferencias aprobadas en QR
    const totalQR = data
      .filter(t => t.estado === "aprobada" && t.tipo === "QR")
      .reduce((sum, t) => sum + getMontoNumber(t.monto), 0);
    setTotalTransferenciasQR(totalQR);

    // Total de transferencias pendientes
    const totalPendientes = data
      .filter(t => t.estado === "pendiente")
      .reduce((sum, t) => sum + getMontoNumber(t.monto), 0);
    setTotalTransferenciasPendientes(totalPendientes);
  };

  // Función para formatear fecha
  const formatDate = (dateStr: string) => {
    try {
      return formatDateForDisplay(dateStr) + " " + formatTimeForDisplay(dateStr);
    } catch {
      return dateStr;
    }
  };

  // Función para obtener el monto como número
  const getMontoNumber = (monto: number | string): number => {
    return typeof monto === 'string' ? parseFloat(monto) : monto;
  };

  // Función para obtener el badge según el estado
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
      case "aprobada":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Aprobada</Badge>;
      case "observada":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Rechazada</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  // Función para obtener el badge según el tipo
  const getTipoBadge = (tipo: string) => {
    if (tipo === "Efectivo") {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Efectivo</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1"><Building2 className="h-3 w-3" /> QR</Badge>;
    }
  };

  // Función para aprobar transferencia (solo admin)
  const handleAprobar = async (id: number) => {
    setProcessingId(id);
    
    try {
      await aprobarTransferencia(id, userId);
      
      const transferenciaAprobada = transferencias.find(t => t.id === id);
      const monto = transferenciaAprobada ? getMontoNumber(transferenciaAprobada.monto) : 0;
      const tipo = transferenciaAprobada?.tipo || "";
      
      setTransferencias(prev => 
        prev.map(t => 
          t.id === id 
            ? { 
                ...t, 
                estado: "aprobada", 
                fecha_aprobacion: new Date().toISOString() 
              } 
            : t
        )
      );
      
      // Recargar datos para actualizar los totales
      await cargarTransferencias();
      
      toast({
        title: "✅ Transferencia aprobada",
        description: `Se descontaron Bs ${monto.toFixed(2)} de la caja origen`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo aprobar la transferencia",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Función para rechazar transferencia (solo admin)
  const handleRechazar = async (id: number) => {
    setProcessingId(id);
    
    try {
      const resultado = await rechazarTransferencia(id, userId, motivoRechazoInput || "Transferencia rechazada");
      
      const transferenciaRechazada = transferencias.find(t => t.id === id);
      const monto = transferenciaRechazada ? getMontoNumber(transferenciaRechazada.monto) : 0;
      
      setTransferencias(prev => 
        prev.map(t => 
          t.id === id 
            ? { 
                ...t, 
                estado: "observada",
                fecha_aprobacion: new Date().toISOString(),
                observacion: motivoRechazoInput || "Transferencia rechazada"
              } 
            : t
        )
      );
      
      // Recargar datos para actualizar los totales
      await cargarTransferencias();
      
      toast({
        title: "❌ Transferencia rechazada",
        description: `Se devolvieron Bs ${monto.toFixed(2)} a la caja origen (Ingreso registrado)`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar la transferencia",
        variant: "destructive",
      });
    } finally {
      setMotivoRechazoInput("");
      setProcessingId(null);
    }
  };

  // Filtrar transferencias según el rol
  const transferenciasFiltradas = isAssistant 
    ? transferencias
    : transferencias;

  // Contar pendientes para mostrar
  const pendientesCount = transferencias.filter(t => t.estado === "pendiente").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando transferencias...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          {isAdmin ? "Transferencias Pendientes" : "Mis Transferencias"}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {pendientesCount} pendientes
              </Badge>
            </>
          ) : (
            <>
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {transferenciasFiltradas.length} registros
              </Badge>
            </>
          )}
          <Button variant="outline" size="sm" onClick={cargarTransferencias} className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Cards de Totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Total Transferencias Efectivo */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Transferencias Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              Bs {totalTransferenciasEfectivo.toFixed(2)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {isAdmin ? 'Transferencias aprobadas en efectivo' : 'Tus transferencias aprobadas en efectivo'}
            </div>
          </CardContent>
        </Card>

        {/* Card: Total Transferencias QR */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Transferencias QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              Bs {totalTransferenciasQR.toFixed(2)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {isAdmin ? 'Transferencias aprobadas en QR' : 'Tus transferencias aprobadas en QR'}
            </div>
          </CardContent>
        </Card>

        {/* Card: Total Transferencias Pendientes */}
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Transferencias Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              Bs {totalTransferenciasPendientes.toFixed(2)}
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              {isAdmin ? 'Total de transferencias pendientes de aprobación' : 'Tus transferencias pendientes de aprobación'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? "Lista de Transferencias Recibidas" : "Historial de Transferencias Realizadas"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({transferenciasFiltradas.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transferenciasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay transferencias para mostrar</p>
              {isAssistant && (
                <p className="text-sm mt-2">
                  Cuando realices una transferencia, aparecerá aquí.
                </p>
              )}
            </div>
          ) : (
            <div className="block md:overflow-x-auto">
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto (Bs)</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    {isAdmin && <TableHead>Usuario Origen</TableHead>}
                    <TableHead>Estado</TableHead>
                    {isAdmin && <TableHead className="text-center">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferenciasFiltradas.map((transferencia) => {
                    const montoNumerico = getMontoNumber(transferencia.monto);
                    return (
                      <TableRow key={transferencia.id} className="md:table-row block border-b p-4 md:p-0">
                        {/* Fecha */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">FECHA</div>
                          <div className="text-sm">{formatDate(transferencia.fecha)}</div>
                        </TableCell>

                        {/* Monto */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MONTO</div>
                          <div className="text-sm font-bold text-primary">Bs {montoNumerico.toFixed(2)}</div>
                        </TableCell>

                        {/* Tipo */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TIPO</div>
                          <div className="flex justify-start md:justify-start">
                            {getTipoBadge(transferencia.tipo)}
                          </div>
                        </TableCell>

                        {/* Descripción */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCRIPCIÓN</div>
                          <div className="text-sm">{transferencia.descripcion}</div>
                          {transferencia.observacion && (
                            <div className="text-xs text-red-600 mt-1">
                              <span className="font-medium">Motivo de rechazo:</span> {transferencia.observacion}
                            </div>
                          )}
                          {transferencia.fecha_aprobacion && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Fecha de resolución:</span> {formatDate(transferencia.fecha_aprobacion)}
                            </div>
                          )}
                        </TableCell>

                        {/* Usuario Origen (solo admin) */}
                        {isAdmin && (
                          <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                            <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">USUARIO ORIGEN</div>
                            <div className="text-sm font-medium">{transferencia.usuario_origen}</div>
                          </TableCell>
                        )}

                        {/* Estado */}
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">ESTADO</div>
                          <div className="flex justify-start md:justify-start">
                            {getEstadoBadge(transferencia.estado)}
                          </div>
                        </TableCell>

                        {/* Acciones (solo admin y solo para pendientes) */}
                        {isAdmin && transferencia.estado === "pendiente" && (
                          <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                            <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">ACCIONES</div>
                            <div className="flex flex-wrap gap-2">
                              {/* Botón Aprobar */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                    disabled={processingId === transferencia.id}
                                  >
                                    {processingId === transferencia.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
                                    Aprobar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Aprobar transferencia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Estás seguro de que deseas aprobar la transferencia de <strong>Bs {montoNumerico.toFixed(2)}</strong> 
                                      realizada por <strong>{transferencia.usuario_origen}</strong> de tipo <strong>{transferencia.tipo}</strong>?
                                      <br /><br />
                                      <span className="text-red-600 font-medium">⚠️ El monto ya fue descontado de la caja origen.</span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleAprobar(transferencia.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Aprobar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {/* Botón Rechazar */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700"
                                    disabled={processingId === transferencia.id}
                                  >
                                    {processingId === transferencia.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    Rechazar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Rechazar transferencia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Estás seguro de que deseas rechazar la transferencia de <strong>Bs {montoNumerico.toFixed(2)}</strong> 
                                      realizada por <strong>{transferencia.usuario_origen}</strong> de tipo <strong>{transferencia.tipo}</strong>?
                                      <br /><br />
                                      <span className="text-green-600 font-medium">✅ El monto se devolverá a la caja origen (Se registrará un ingreso).</span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="py-4">
                                    <Label htmlFor="motivoRechazo" className="text-sm font-medium">
                                      Motivo del rechazo
                                    </Label>
                                    <Input
                                      id="motivoRechazo"
                                      placeholder="Ej: Documentación incompleta..."
                                      value={motivoRechazoInput}
                                      onChange={(e) => setMotivoRechazoInput(e.target.value)}
                                      className="mt-2"
                                    />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel 
                                      onClick={() => setMotivoRechazoInput("")}
                                    >
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => {
                                        handleRechazar(transferencia.id);
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Rechazar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                        
                        {/* Para admin con transferencias ya procesadas */}
                        {isAdmin && transferencia.estado !== "pendiente" && (
                          <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                            <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">ACCIONES</div>
                            <span className="text-xs text-muted-foreground">Procesada</span>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}