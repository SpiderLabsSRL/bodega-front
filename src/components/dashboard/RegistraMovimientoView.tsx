// src/components/dashboard/RegistraMovimientoView.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Wallet, CheckCircle, XCircle, Building2 } from "lucide-react";
import { 
  getAdminUsers
} from "@/api/CajaApi";

// Tipos de caja
type TipoCaja = "Efectivo" | "QR" | "";

interface RegistraMovimientoViewProps {
  onClose?: () => void;
}

export function RegistraMovimientoView({ onClose }: RegistraMovimientoViewProps) {
  // Estado para el paso de selección de tipo de caja (SIEMPRE empieza aquí)
  const [pasoSeleccionCaja, setPasoSeleccionCaja] = useState<boolean>(true);
  const [tipoCaja, setTipoCaja] = useState<TipoCaja>("");
  const [tipoMovimiento, setTipoMovimiento] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [usuarioTransferencia, setUsuarioTransferencia] = useState<string>("");
  const [saldoActual, setSaldoActual] = useState<number>(1500);
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [usuariosAdmin, setUsuariosAdmin] = useState<{id: number; nombre: string; usuario: string}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    cargarUsuariosAdmin();
  }, []);

  const cargarUsuariosAdmin = async () => {
    const usuarios = await getAdminUsers();
    setUsuariosAdmin(usuarios)
  }

  // Determinar las opciones de movimiento según el tipo de caja y estado
  const getMovimientoOptions = () => {
    if (tipoCaja === "Efectivo") {
      // Si la caja está cerrada: SOLO Apertura
      if (!cajaAbierta) {
        return [{ value: "Apertura", label: "Apertura" }];
      }
      // Si la caja está abierta: Ingreso, Egreso, Transferencia, Cierre
      return [
        { value: "Ingreso", label: "Ingreso" },
        { value: "Egreso", label: "Egreso" },
        { value: "Transferencia", label: "Transferencia" },
        { value: "Cierre", label: "Cierre" },
      ];
    } else if (tipoCaja === "QR") {
      // Para QR: siempre Ingreso, Egreso y Transferencia
      return [
        { value: "Ingreso", label: "Ingreso" },
        { value: "Egreso", label: "Egreso" },
        { value: "Transferencia", label: "Transferencia" },
      ];
    }
    return [];
  };

  const getTipoTexto = (tipo: string) => {
    const tipoTextos: { [key: string]: string } = {
      "Ingreso": "Ingreso",
      "Egreso": "Egreso", 
      "Apertura": "Apertura de caja",
      "Cierre": "Cierre de caja",
      "Transferencia": "Transferencia"
    };
    return tipoTextos[tipo] || tipo;
  };

  // Cuando se selecciona Apertura, se pone automáticamente el saldo actual
  // Cuando se selecciona Cierre, se pone automáticamente el saldo actual
  const handleTipoMovimientoChange = (value: string) => {
    setTipoMovimiento(value);
    if (value === "Apertura" || value === "Cierre") {
      setMonto(saldoActual.toString());
    } else {
      setMonto("");
    }
  };

  const handleSubmit = async () => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      // Validaciones según el tipo de movimiento
      if (!tipoMovimiento) {
        toast({
          title: "Error",
          description: "Por favor selecciona el tipo de movimiento",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      // Validar monto
      if (!monto) {
        toast({
          title: "Error",
          description: "Por favor ingresa el monto",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      // Validar descripción para Ingreso, Egreso y Transferencia
      if ((tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso" || tipoMovimiento === "Transferencia") && !descripcion) {
        toast({
          title: "Error",
          description: "Por favor ingresa una descripción",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      // Validar usuario para Transferencia
      if (tipoMovimiento === "Transferencia" && !usuarioTransferencia) {
        toast({
          title: "Error",
          description: "Por favor selecciona el usuario destino para la transferencia",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      // Simular la operación con datos mock
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (tipoMovimiento === "Apertura") {
        setCajaAbierta(true);
        setSaldoActual(parseFloat(monto));
        toast({
          title: "Caja abierta",
          description: `Caja de ${tipoCaja} abierta con monto inicial de ${monto} Bs correctamente`,
        });
        // Limpiar y volver a selección de caja para que el usuario pueda elegir otra acción
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      } else if (tipoMovimiento === "Cierre") {
        setCajaAbierta(false);
        toast({
          title: "Caja cerrada",
          description: `Caja de ${tipoCaja} cerrada con saldo final de ${saldoActual.toFixed(2)} Bs correctamente`,
        });
        // Limpiar y volver a selección de caja
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
        // Volver a la selección de tipo de caja
        setTipoCaja("");
        setPasoSeleccionCaja(true);
      } else if (tipoMovimiento === "Transferencia") {
        const usuario = usuariosAdmin.find(u => u.usuario === usuarioTransferencia);
        toast({
          title: "Transferencia registrada",
          description: `Transferencia de ${monto} Bs a ${usuario?.nombre || usuarioTransferencia} registrada correctamente en caja de ${tipoCaja}`,
        });
        // Limpiar campos para seguir registrando
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      } else if (tipoMovimiento === "Ingreso") {
        const nuevoSaldo = saldoActual + parseFloat(monto);
        setSaldoActual(nuevoSaldo);
        toast({
          title: "Ingreso registrado",
          description: `Ingreso de ${monto} Bs registrado correctamente en caja de ${tipoCaja}`,
        });
        // Limpiar campos para seguir registrando
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      } else if (tipoMovimiento === "Egreso") {
        const nuevoSaldo = saldoActual - parseFloat(monto);
        setSaldoActual(nuevoSaldo);
        toast({
          title: "Egreso registrado",
          description: `Egreso de ${monto} Bs registrado correctamente en caja de ${tipoCaja}`,
        });
        // Limpiar campos para seguir registrando
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const requiredFields = () => {
    if (tipoMovimiento === "Apertura" || tipoMovimiento === "Cierre") {
      return !!monto;
    } else if (tipoMovimiento === "Transferencia") {
      return !!monto && !!descripcion && !!usuarioTransferencia;
    } else if (tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso") {
      return !!monto && !!descripcion;
    }
    return false;
  };

  const getDescripcionPlaceholder = () => {
    switch (tipoMovimiento) {
      case "Apertura":
        return `Apertura de caja de ${tipoCaja}`;
      case "Cierre":
        return `Cierre de caja de ${tipoCaja}`;
      case "Transferencia":
        return "Descripción de la transferencia...";
      default:
        return "Descripción del movimiento...";
    }
  };

  const getButtonText = () => {
    if (tipoMovimiento === "Apertura") return processing ? "Abriendo Caja..." : "Abrir Caja";
    if (tipoMovimiento === "Cierre") return processing ? "Cerrando Caja..." : "Cerrar Caja";
    if (tipoMovimiento === "Transferencia") return processing ? "Registrando Transferencia..." : "Registrar Transferencia";
    return processing ? "Registrando..." : "Registrar Movimiento";
  };

  const getAlertDescription = () => {
    if (tipoMovimiento === "Apertura") {
      return `¿Estás seguro de que deseas abrir la caja de ${tipoCaja} con el saldo actual de ${monto} Bs?`;
    } else if (tipoMovimiento === "Cierre") {
      return `¿Estás seguro de que deseas cerrar la caja de ${tipoCaja} con el saldo actual de ${saldoActual.toFixed(2)} Bs?`;
    } else if (tipoMovimiento === "Transferencia") {
      const usuario = usuariosAdmin.find(u => u.usuario === usuarioTransferencia);
      return `¿Estás seguro de que deseas realizar una transferencia de ${monto} Bs a ${usuario?.nombre || usuarioTransferencia} en caja de ${tipoCaja}?`;
    } else {
      return `¿Estás seguro de que deseas registrar este ${tipoMovimiento.toLowerCase()} de ${monto} Bs en caja de ${tipoCaja}?${
        descripcion ? `\nDescripción: ${descripcion}` : ''
      }`;
    }
  };

  const isButtonDisabled = () => {
    return !requiredFields() || processing || !tipoCaja;
  };

  // Mostrar el monto automático para Apertura y Cierre
  const getMontoLabel = () => {
    if (tipoMovimiento === "Apertura") {
      return "Monto Inicial (Bs) - Automático";
    }
    if (tipoMovimiento === "Cierre") {
      return "Monto Final (Bs) - Automático";
    }
    return "Monto (Bs)";
  };

  const isMontoDisabled = () => {
    return tipoMovimiento === "Apertura" || tipoMovimiento === "Cierre";
  };

  // PASO 1: SIEMPRE mostrar selección de tipo de caja primero
  if (pasoSeleccionCaja) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">Seleccionar Tipo de Caja</h1>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">¿Qué tipo de caja deseas usar?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
              <Button
                variant="default"
                className="h-32 text-lg flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform"
                onClick={() => {
                  setTipoCaja("Efectivo");
                  setPasoSeleccionCaja(false);
                  setCajaAbierta(false);
                }}
              >
                <DollarSign className="h-12 w-12" />
                <span className="font-bold">Efectivo</span>
              </Button>
              <Button
                variant="default"
                className="h-32 text-lg flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform"
                onClick={() => {
                  setTipoCaja("QR");
                  setPasoSeleccionCaja(false);
                  setCajaAbierta(false);
                }}
              >
                <Building2 className="h-12 w-12" />
                <span className="font-bold">QR</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PASO 2: Formulario de registro de movimiento
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary">Registrar Movimiento</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setPasoSeleccionCaja(true);
              setTipoCaja("");
              setTipoMovimiento("");
              setMonto("");
              setDescripcion("");
              setUsuarioTransferencia("");
            }}
          >
            Cambiar Caja
          </Button>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>

      {/* Estado de Caja */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Caja:</span>
          {tipoCaja === "Efectivo" ? (
            <>
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">Efectivo</span>
            </>
          ) : tipoCaja === "QR" ? (
            <>
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">QR</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No seleccionada</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Estado:</span>
          {cajaAbierta ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">ABIERTA</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-600">CERRADA</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Saldo:</span>
          <span className="text-sm font-bold">Bs {saldoActual.toFixed(2)}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimiento de Caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipoMovimiento">Tipo de Movimiento</Label>
            <Select 
              value={tipoMovimiento} 
              onValueChange={handleTipoMovimientoChange} 
              disabled={processing || !tipoCaja}
            >
              <SelectTrigger>
                <SelectValue placeholder={tipoCaja ? "Seleccionar movimiento" : "Selecciona primero el tipo de caja"} />
              </SelectTrigger>
              <SelectContent>
                {getMovimientoOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selección de usuario para Transferencia */}
          {tipoMovimiento === "Transferencia" && (
            <div className="space-y-2">
              <Label htmlFor="usuarioTransferencia">Usuario Destino (Admin)</Label>
              <Select 
                value={usuarioTransferencia} 
                onValueChange={setUsuarioTransferencia} 
                disabled={processing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario Admin" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosAdmin.map((user) => (
                    <SelectItem key={user.id} value={user.usuario}>
                      {user.nombre} ({user.usuario})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Campo de monto - Deshabilitado para Apertura y Cierre (automático) */}
          {(tipoMovimiento === "Apertura" || tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso" || tipoMovimiento === "Transferencia" || tipoMovimiento === "Cierre") && (
            <div className="space-y-2">
              <Label htmlFor="monto">{getMontoLabel()}</Label>
              <Input
                id="monto"
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
                className="number-input-no-scroll"
                onWheel={(e) => e.currentTarget.blur()}
                disabled={processing || isMontoDisabled()}
              />
              {isMontoDisabled() && (
                <p className="text-xs text-muted-foreground">
                  El monto se asigna automáticamente con el saldo actual
                </p>
              )}
            </div>
          )}

          {/* Campo de descripción */}
          {(tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso" || tipoMovimiento === "Transferencia") && (
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder={getDescripcionPlaceholder()}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                disabled={processing}
              />
            </div>
          )}

          {/* Información para Apertura */}
          {tipoMovimiento === "Apertura" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold">Información de Apertura</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                La caja de {tipoCaja} se abrirá con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>
              </p>
            </div>
          )}

          {/* Información para Cierre */}
          {tipoMovimiento === "Cierre" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Wallet className="h-4 w-4" />
                <span className="font-semibold">Información de Cierre</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                La caja de {tipoCaja} se cerrará con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>
              </p>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={isButtonDisabled()}
              >
                {getButtonText()}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar operación?</AlertDialogTitle>
                <AlertDialogDescription className="whitespace-pre-line">
                  {getAlertDescription()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSubmit}
                  disabled={processing}
                >
                  {processing ? "Procesando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}