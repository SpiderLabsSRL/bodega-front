import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ShoppingCart, Plus, Minus, Sparkles, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/api/HomeApi";
import { getImageUrl } from "./dashboard/VenderView";

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export function ProductDetailsModal({ product, isOpen, onClose, onAddToCart }: ProductDetailsModalProps) {
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && product) {
      setCurrentImageIndex(0);
      setIsZoomed(false);
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const formatDescriptionForProduction = (description: string): string => {
    if (!description) return "Sin descripción";
    
    const normalizedDescription = description
      .replace(/\r\n/g, '\n')  // Windows a Unix
      .replace(/\r/g, '\n')    // Mac antiguo a Unix
      .replace(/\n+/g, '\n')   // Múltiples saltos a uno solo
      .trim();
    return normalizedDescription;
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const incrementQuantity = () => {
    const stock = product.stock;
    if (quantity < stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (!onAddToCart) return;
    
    onAddToCart(product, quantity);
    
    toast({
      title: "Agregado al carrito",
      description: `${product.name}`,
    });
    
    onClose();
  };

  const getStockStatus = () => {
    const stock = product.stock;
    if (stock === 0) {
      return { text: "Agotado", variant: "destructive" as const };
    } else {
      return { text: "Disponible", variant: "default" as const };
    }
  };

  const stockStatus = getStockStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] md:w-full overflow-y-auto p-4 md:p-6">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-bold text-primary">
            {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Image Gallery */}
          <div className="space-y-2 md:space-y-4">
            {/* Main Image */}
            <div className="relative w-full bg-muted/30 rounded-lg overflow-hidden h-80 md:h-96 lg:aspect-square lg:h-auto">
              <img
                src={getImageUrl(product.image)}
                alt={`${product.name} - imagen ${currentImageIndex + 1}`}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 ${
                  isZoomed ? 'scale-150 cursor-grab' : 'cursor-zoom-in'
                }`}
                onClick={toggleZoom}
                draggable={false}
              />

              {/* Zoom button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleZoom}
                className="absolute bottom-2 right-2 bg-black/50 text-white hover:bg-black/70 h-10 w-10 p-0 rounded-full"
              >
                {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
              </Button>
            </div>

          </div>

          {/* Product Information */}
          <div className="space-y-4 md:space-y-6">
            <div>
              <h3 className="text-lg md:text-2xl font-bold text-foreground mb-2">
                {product.name}
              </h3>
              <div className="text-muted-foreground text-sm md:text-lg leading-relaxed whitespace-pre-line">
                {formatDescriptionForProduction(product.description)}
              </div>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={stockStatus.variant}>
                      {stockStatus.text}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="text-xl md:text-2xl font-black text-primary">
                      Bs. {product.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {onAddToCart && (
              <div className="mt-4 md:mt-6 space-y-4">
                {/* Quantity Selector */}
                {(product.stock || product.stock) > 0 && (
                  <div className="flex items-center justify-center space-x-4">
                    <span className="text-sm font-medium text-muted-foreground">Cantidad:</span>
                    <div className="flex items-center space-x-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold text-lg min-w-[2rem] text-center">{quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={incrementQuantity}
                        disabled={quantity >= (product.stock || product.stock)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={(product.stock || product.stock) === 0}
                  className="w-full btn-neoled-secondary group text-sm h-10 md:h-12"
                >
                  <ShoppingCart className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
                  {(product.stock || product.stock) === 0 ? 'Agotado' : `Agregar ${quantity} al Carrito`}
                </Button>

                {/* Información importante sobre variantes */}
                {product && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Se agregará el producto seleccionado: <strong>{product?.name}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}