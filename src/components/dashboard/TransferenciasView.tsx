// src/components/dashboard/TransferenciasView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, User, Users, DollarSign, Building2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  getTransferencias, 
  aprobarTransferencia, 
  observarTransferencia,
  rechazarTransferencia,
  getSaldoCaja,
  Transferencia 
} from "@/api/TransferenciaApi";

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
  const [observacionInput, setObservacionInput] = useState<string>("");
  const [motivoRechazoInput, setMotivoRechazoInput] = useState<string>("");
  
  // Estado para el total de transferencias (solo frontend)
  const [totalTransferencias, setTotalTransferencias] = useState<number>(0);
  const [mostrarRechazo, setMostrarRechazo] = useState<number | null>(null);

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
      
      // Calcular total de transferencias aprobadas (solo frontend)
      const totalAprobadas = data
        .filter(t => t.estado === "aprobada")
        .reduce((sum, t) => sum + getMontoNumber(t.monto), 0);
      setTotalTransferencias(totalAprobadas);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las transferencias",
        variant: "destructive",
      });
      setTransferencias([]);
      setTotalTransferencias(0);
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Observada</Badge>;
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
      const resultado = await aprobarTransferencia(id, userId);
      
      // Actualizar la transferencia localmente
      const transferenciaAprobada = transferencias.find(t => t.id === id);
      const monto = transferenciaAprobada ? getMontoNumber(transferenciaAprobada.monto) : 0;
      
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
      
      // Actualizar total de transferencias (frontend)
      setTotalTransferencias(prev => prev + monto);
      
      toast({
        title: "Transferencia aprobada",
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

  // Función para observar transferencia (solo admin)
  const handleObservar = async (id: number) => {
    setProcessingId(id);
    
    try {
      const resultado = await observarTransferencia(id, userId, observacionInput || "Revisar documentación adjunta");
      
      // Actualizar la transferencia localmente
      const transferenciaObservada = transferencias.find(t => t.id === id);
      const monto = transferenciaObservada ? getMontoNumber(transferenciaObservada.monto) : 0;
      
      setTransferencias(prev => 
        prev.map(t => 
          t.id === id 
            ? { 
                ...t, 
                estado: "observada",
                fecha_aprobacion: new Date().toISOString(),
                observacion: observacionInput || "Revisar documentación adjunta"
              } 
            : t
        )
      );
      
      toast({
        title: "Transferencia observada",
        description: `Se revertió Bs ${monto.toFixed(2)} a la caja origen`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo observar la transferencia",
        variant: "destructive",
      });
    } finally {
      setObservacionInput("");
      setProcessingId(null);
    }
  };

  // Función para rechazar transferencia (solo admin)
  const handleRechazar = async (id: number) => {
    setProcessingId(id);
    
    try {
      const resultado = await rechazarTransferencia(id, userId, motivoRechazoInput || "Transferencia rechazada");
      
      // Actualizar la transferencia localmente
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
      
      toast({
        title: "Transferencia rechazada",
        description: `Se revertió Bs ${monto.toFixed(2)} a la caja origen`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar la transferencia",
        variant: "destructive",
      });
    } finally {
      setMotivoRechazoInput("");
      setMostrarRechazo(null);
      setProcessingId(null);
    }
  };

  // Filtrar transferencias según el rol
  const transferenciasFiltradas = isAssistant 
    ? transferencias
    : transferencias;

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
                {transferencias.filter(t => t.estado === "pendiente").length} pendientes
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 bg-green-50 border-green-300">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-semibold">Total Transferencias: Bs {totalTransferencias.toFixed(2)}</span>
              </Badge>
            </>
          ) : (
            <>
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {transferenciasFiltradas.length} registros
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 bg-green-50 border-green-300">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-semibold">Total Transferencias: Bs {totalTransferencias.toFixed(2)}</span>
              </Badge>
            </>
          )}
          <Button variant="outline" size="sm" onClick={cargarTransferencias} className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tarjeta de resumen de transferencias */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total de Transferencias Aprobadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            Bs {totalTransferencias.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {isAdmin ? 'Monto total de todas las transferencias aprobadas' : 'Monto total de tus transferencias aprobadas'}
          </div>
        </CardContent>
      </Card>

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
                              <span className="font-medium">Observación:</span> {transferencia.observacion}
                            </div>
                          )}
                          {transferencia.fecha_aprobacion && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Fecha de aprobación:</span> {formatDate(transferencia.fecha_aprobacion)}
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
                                      <span className="text-red-600 font-medium">⚠️ El monto se descontará de la caja origen.</span>
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

                              {/* Botón Observar */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                                    disabled={processingId === transferencia.id}
                                  >
                                    {processingId === transferencia.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    Observar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Observar transferencia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Estás seguro de que deseas marcar como observada la transferencia de <strong>Bs {montoNumerico.toFixed(2)}</strong> 
                                      realizada por <strong>{transferencia.usuario_origen}</strong> de tipo <strong>{transferencia.tipo}</strong>?
                                      <br /><br />
                                      <span className="text-green-600 font-medium">✅ El monto se devolverá a la caja origen.</span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="py-4">
                                    <Label htmlFor="observacion" className="text-sm font-medium">
                                      Motivo de la observación
                                    </Label>
                                    <Input
                                      id="observacion"
                                      placeholder="Ej: Falta comprobante de pago..."
                                      value={observacionInput}
                                      onChange={(e) => setObservacionInput(e.target.value)}
                                      className="mt-2"
                                    />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel 
                                      onClick={() => setObservacionInput("")}
                                    >
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => {
                                        handleObservar(transferencia.id);
                                      }}
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                      Observar
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
                                      <span className="text-green-600 font-medium">✅ El monto se devolverá a la caja origen.</span>
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