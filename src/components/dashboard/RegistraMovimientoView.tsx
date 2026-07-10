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
import { DollarSign, Wallet, CheckCircle, XCircle, Building2, Loader2 } from "lucide-react";
import { 
  getAdminUsers,
  getSaldoActual,
  createTransaccionCaja
} from "@/api/CajaApi";

type TipoCaja = "Efectivo" | "QR" | "";

interface RegistraMovimientoViewProps {
  onClose?: () => void;
  onTransaccionExitosa?: () => void; // Nueva prop
}

export function RegistraMovimientoView({ onClose, onTransaccionExitosa }: RegistraMovimientoViewProps) {
  const [pasoSeleccionCaja, setPasoSeleccionCaja] = useState<boolean>(true);
  const [tipoCaja, setTipoCaja] = useState<TipoCaja>("");
  const [tipoMovimiento, setTipoMovimiento] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [usuarioTransferencia, setUsuarioTransferencia] = useState<string>("");
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [loadingSaldo, setLoadingSaldo] = useState<boolean>(false);
  const [usuariosAdmin, setUsuariosAdmin] = useState<{id: number; nombre: string; usuario: string}[]>([]);
  const { toast } = useToast();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser?.idusuario || currentUser?.idUsuario || 1;
  const idbodega = currentUser?.idbodega || 1;

  useEffect(() => {
    cargarUsuariosAdmin();
  }, []);

  useEffect(() => {
    if (tipoCaja && idbodega) {
      cargarSaldoActual();
    }
  }, [tipoCaja, idbodega]);

  const cargarUsuariosAdmin = async () => {
    try {
      const usuarios = await getAdminUsers();
      setUsuariosAdmin(usuarios);
    } catch (error) {
      console.error("Error cargando usuarios admin:", error);
    }
  };

  const cargarSaldoActual = async () => {
    if (!tipoCaja || !idbodega) return;
    
    setLoadingSaldo(true);
    try {
      const saldoData = await getSaldoActual({ idbodega, tipoCaja });
      const saldo = parseFloat(saldoData.monto_final);
      setSaldoActual(saldo);
      // Solo mostrar estado si es Efectivo
      if (tipoCaja === "Efectivo") {
        setCajaAbierta(saldoData.estado === 'abierta');
      } else {
        setCajaAbierta(false); // QR no tiene estado
      }
    } catch (error) {
      console.error("Error cargando saldo:", error);
      setSaldoActual(0);
      setCajaAbierta(false);
    } finally {
      setLoadingSaldo(false);
    }
  };

  const getMovimientoOptions = () => {
    if (tipoCaja === "Efectivo") {
      if (!cajaAbierta) {
        return [{ value: "Apertura", label: "Apertura" }];
      }
      return [
        { value: "Ingreso", label: "Ingreso" },
        { value: "Egreso", label: "Egreso" },
        { value: "Transferencia", label: "Transferencia" },
        { value: "Cierre", label: "Cierre" },
      ];
    } else if (tipoCaja === "QR") {
      // QR solo tiene Ingreso, Egreso y Transferencia (sin apertura/cierre)
      return [
        { value: "Ingreso", label: "Ingreso" },
        { value: "Egreso", label: "Egreso" },
        { value: "Transferencia", label: "Transferencia" },
      ];
    }
    return [];
  };

  const handleTipoMovimientoChange = (value: string) => {
    setTipoMovimiento(value);
    if (value === "Apertura") {
      setMonto(saldoActual.toString());
    } else if (value === "Cierre") {
      setMonto(saldoActual.toString());
    } else {
      setMonto("");
    }
  };

  const handleSubmit = async () => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      if (!tipoMovimiento) {
        toast({
          title: "Error",
          description: "Por favor selecciona el tipo de movimiento",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      if (!monto || parseFloat(monto) < 0) {
        toast({
          title: "Error",
          description: "Por favor ingresa un monto válido",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      if ((tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso" || tipoMovimiento === "Transferencia") && !descripcion) {
        toast({
          title: "Error",
          description: "Por favor ingresa una descripción",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      if (tipoMovimiento === "Transferencia" && !usuarioTransferencia) {
        toast({
          title: "Error",
          description: "Por favor selecciona el usuario destino para la transferencia",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      const data: any = {
        tipoCaja,
        tipoMovimiento,
        monto: parseFloat(monto),
        descripcion,
        idbodega,
        idusuario: userId,
      };

      if (tipoMovimiento === "Transferencia") {
        data.usuarioTransferencia = usuarioTransferencia;
      }

      const resultado = await createTransaccionCaja(data);

      if (tipoMovimiento === "Apertura") {
        setCajaAbierta(true);
        await cargarSaldoActual();
        toast({
          title: "Caja abierta",
          description: `Caja de ${tipoCaja} abierta con saldo de ${monto} Bs correctamente`,
        });
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
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
        setTipoCaja("");
        setPasoSeleccionCaja(true);
      } else if (tipoMovimiento === "Transferencia") {
        const usuario = usuariosAdmin.find(u => u.usuario === usuarioTransferencia);
        const mensaje = resultado.estado === 'pendiente' 
          ? `Transferencia de ${monto} Bs a ${usuario?.nombre || usuarioTransferencia} registrada. Pendiente de aprobación.`
          : `Transferencia de ${monto} Bs a ${usuario?.nombre || usuarioTransferencia} aprobada automáticamente.`;
        
        toast({
          title: resultado.estado === 'pendiente' ? "Transferencia registrada" : "Transferencia aprobada",
          description: mensaje,
        });
        
        await cargarSaldoActual();
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      } else if (tipoMovimiento === "Ingreso") {
        await cargarSaldoActual();
        toast({
          title: "Ingreso registrado",
          description: `Ingreso de ${monto} Bs registrado correctamente en caja de ${tipoCaja}`,
        });
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      } else if (tipoMovimiento === "Egreso") {
        await cargarSaldoActual();
        toast({
          title: "Egreso registrado",
          description: `Egreso de ${monto} Bs registrado correctamente en caja de ${tipoCaja}`,
        });
        setTipoMovimiento("");
        setMonto("");
        setDescripcion("");
        setUsuarioTransferencia("");
      }

      // ✅ NOTIFICAR AL COMPONENTE PADRE QUE HUBO UNA TRANSACCIÓN EXITOSA
      if (onTransaccionExitosa) {
        onTransaccionExitosa();
      }

      // Si es Cierre, cerramos el modal automáticamente
      if (tipoMovimiento === "Cierre") {
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 500);
        }
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
      return !!monto && parseFloat(monto) >= 0;
    } else if (tipoMovimiento === "Transferencia") {
      return !!monto && parseFloat(monto) > 0 && !!descripcion && !!usuarioTransferencia;
    } else if (tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso") {
      return !!monto && parseFloat(monto) > 0 && !!descripcion;
    }
    return false;
  };

  const getDescripcionPlaceholder = () => {
    switch (tipoMovimiento) {
      case "Apertura":
        return `Apertura de caja de ${tipoCaja} con saldo de ${monto || '0'} Bs`;
      case "Cierre":
        return `Cierre de caja de ${tipoCaja} con saldo de ${saldoActual.toFixed(2)} Bs`;
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
    return !requiredFields() || processing || !tipoCaja || loadingSaldo;
  };

  const getMontoLabel = () => {
    if (tipoMovimiento === "Apertura") {
      return "Saldo con el que se abre (Bs) - Automático";
    }
    if (tipoMovimiento === "Cierre") {
      return "Saldo con el que se cierra (Bs) - Automático";
    }
    return "Monto (Bs)";
  };

  const isMontoDisabled = () => {
    return tipoMovimiento === "Apertura" || tipoMovimiento === "Cierre";
  };

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
        {/* Solo mostrar estado si es Efectivo */}
        {tipoCaja === "Efectivo" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Estado:</span>
            {loadingSaldo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cajaAbierta ? (
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
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Saldo:</span>
          {loadingSaldo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-sm font-bold">Bs {saldoActual.toFixed(2)}</span>
          )}
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
              disabled={processing || !tipoCaja || loadingSaldo}
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

          {(tipoMovimiento === "Apertura" || tipoMovimiento === "Ingreso" || tipoMovimiento === "Egreso" || tipoMovimiento === "Transferencia" || tipoMovimiento === "Cierre") && (
            <div className="space-y-2">
              <Label htmlFor="monto">{getMontoLabel()}</Label>
              <Input
                id="monto"
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => {
                  if (!isMontoDisabled()) {
                    setMonto(e.target.value);
                  }
                }}
                min="0"
                step="0.01"
                className="number-input-no-scroll"
                onWheel={(e) => e.currentTarget.blur()}
                disabled={processing || isMontoDisabled() || loadingSaldo}
              />
              {isMontoDisabled() && (
                <p className="text-xs text-muted-foreground">
                  {tipoMovimiento === "Apertura" 
                    ? "El saldo actual se usa automáticamente para la apertura" 
                    : "El saldo final se calcula automáticamente"}
                </p>
              )}
            </div>
          )}

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

          {tipoMovimiento === "Apertura" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold">Información de Apertura</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                La caja de {tipoCaja} se abrirá con el saldo actual de <strong>Bs {monto || '0.00'}</strong>
              </p>
              {parseFloat(monto) > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Este saldo incluye todos los movimientos previos registrados
                </p>
              )}
            </div>
          )}

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
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  getButtonText()
                )}
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