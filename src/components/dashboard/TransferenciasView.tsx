// src/components/dashboard/TransferenciasView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, User, Users, DollarSign, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/api/AuthApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Tipos para las transferencias
interface Transferencia {
  id: number;
  fecha: string;
  monto: number;
  descripcion: string;
  usuarioOrigen: string;
  usuarioDestino: string;
  estado: "pendiente" | "aprobada" | "observada";
  tipo: "Efectivo" | "QR";
  fechaAprobacion?: string;
  observacion?: string;
}

// Datos mock - TODAS las transferencias empiezan como "pendiente"
const MOCK_TRANSFERENCIAS_ADMIN: Transferencia[] = [
  {
    id: 1,
    fecha: new Date().toISOString(),
    monto: 500,
    descripcion: "Transferencia por venta de productos",
    usuarioOrigen: "Usuario Prueba",
    usuarioDestino: "Admin Principal",
    estado: "pendiente",
    tipo: "Efectivo"
  },
  {
    id: 2,
    fecha: new Date(Date.now() - 3600000).toISOString(),
    monto: 350,
    descripcion: "Pago de comisiones",
    usuarioOrigen: "Asistente Test",
    usuarioDestino: "Admin Principal",
    estado: "pendiente",
    tipo: "QR"
  },
  {
    id: 3,
    fecha: new Date(Date.now() - 7200000).toISOString(),
    monto: 200,
    descripcion: "Reembolso de gastos",
    usuarioOrigen: "Usuario Prueba",
    usuarioDestino: "Admin Principal",
    estado: "pendiente",
    tipo: "Efectivo"
  },
  {
    id: 4,
    fecha: new Date(Date.now() - 10800000).toISOString(),
    monto: 150,
    descripcion: "Pago de servicios",
    usuarioOrigen: "Asistente Test",
    usuarioDestino: "Admin Principal",
    estado: "pendiente",
    tipo: "QR"
  }
];

// Datos mock para asistente - sus transferencias ya procesadas
const MOCK_TRANSFERENCIAS_ASISTENTE: Transferencia[] = [
  {
    id: 5,
    fecha: new Date().toISOString(),
    monto: 500,
    descripcion: "Transferencia por venta de productos",
    usuarioOrigen: "Usuario Prueba",
    usuarioDestino: "Admin Principal",
    estado: "aprobada",
    tipo: "Efectivo",
    fechaAprobacion: new Date().toISOString()
  },
  {
    id: 6,
    fecha: new Date(Date.now() - 7200000).toISOString(),
    monto: 200,
    descripcion: "Reembolso de gastos",
    usuarioOrigen: "Usuario Prueba",
    usuarioDestino: "Admin Principal",
    estado: "aprobada",
    tipo: "QR",
    fechaAprobacion: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 7,
    fecha: new Date(Date.now() - 10800000).toISOString(),
    monto: 150,
    descripcion: "Pago de servicios",
    usuarioOrigen: "Usuario Prueba",
    usuarioDestino: "Admin Principal",
    estado: "observada",
    tipo: "Efectivo",
    fechaAprobacion: new Date(Date.now() - 5400000).toISOString(),
    observacion: "Falta comprobante de pago"
  }
];

export function TransferenciasView() {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.rol?.toLowerCase() || "admin";
  const isAdmin = userRole === "admin";
  const isAssistant = userRole === "asistente";

  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [observacionInput, setObservacionInput] = useState<string>("");

  // Cargar datos mock según el rol
  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      
      // Simular carga
      setTimeout(() => {
        if (isAdmin) {
          // Admin ve todas las transferencias con estado "pendiente"
          setTransferencias(MOCK_TRANSFERENCIAS_ADMIN);
        } else if (isAssistant) {
          // Asistente ve sus transferencias (aprobadas y observadas)
          const transferenciasFiltradas = MOCK_TRANSFERENCIAS_ASISTENTE.filter(
            t => t.estado === "aprobada" || t.estado === "observada"
          );
          setTransferencias(transferenciasFiltradas);
        }
        setLoading(false);
      }, 800);
    };

    loadData();
  }, [isAdmin, isAssistant]);

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
    
    // Simular proceso
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setTransferencias(prev => 
      prev.map(t => 
        t.id === id 
          ? { 
              ...t, 
              estado: "aprobada", 
              fechaAprobacion: new Date().toISOString() 
            } 
          : t
      )
    );
    
    toast({
      title: "Transferencia aprobada",
      description: "La transferencia ha sido aprobada correctamente",
    });
    
    setProcessingId(null);
  };

  // Función para observar transferencia (solo admin) con observación
  const handleObservar = async (id: number) => {
    setProcessingId(id);
    
    // Simular proceso
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setTransferencias(prev => 
      prev.map(t => 
        t.id === id 
          ? { 
              ...t, 
              estado: "observada",
              fechaAprobacion: new Date().toISOString(),
              observacion: observacionInput || "Revisar documentación adjunta"
            } 
          : t
      )
    );
    
    toast({
      title: "Transferencia observada",
      description: "La transferencia ha sido marcada como observada",
      variant: "destructive",
    });
    
    setObservacionInput("");
    setProcessingId(null);
  };

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
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {transferencias.filter(t => t.estado === "pendiente").length} pendientes
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {transferencias.length} registros
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? "Lista de Transferencias Recibidas" : "Historial de Transferencias Realizadas"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({transferencias.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transferencias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay transferencias para mostrar</p>
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
                  {transferencias.map((transferencia) => (
                    <TableRow key={transferencia.id} className="md:table-row block border-b p-4 md:p-0">
                      {/* Fecha */}
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">FECHA</div>
                        <div className="text-sm">{formatDate(transferencia.fecha)}</div>
                      </TableCell>

                      {/* Monto */}
                      <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                        <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MONTO</div>
                        <div className="text-sm font-bold text-primary">Bs {transferencia.monto.toFixed(2)}</div>
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
                        {transferencia.fechaAprobacion && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Fecha de aprobación:</span> {formatDate(transferencia.fechaAprobacion)}
                          </div>
                        )}
                      </TableCell>

                      {/* Usuario Origen (solo admin) */}
                      {isAdmin && (
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">USUARIO ORIGEN</div>
                          <div className="text-sm font-medium">{transferencia.usuarioOrigen}</div>
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
                            {/* Botón Aprobar con confirmación */}
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
                                    ¿Estás seguro de que deseas aprobar la transferencia de <strong>Bs {transferencia.monto.toFixed(2)}</strong> 
                                    realizada por <strong>{transferencia.usuarioOrigen}</strong> de tipo <strong>{transferencia.tipo}</strong>?
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

                            {/* Botón Observar con confirmación y campo de observación */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="flex items-center gap-1"
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
                                    ¿Estás seguro de que deseas marcar como observada la transferencia de <strong>Bs {transferencia.monto.toFixed(2)}</strong> 
                                    realizada por <strong>{transferencia.usuarioOrigen}</strong> de tipo <strong>{transferencia.tipo}</strong>?
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
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Observar
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}