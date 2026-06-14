import { useState, useEffect } from "react";
import { Eye, ChevronLeft, ChevronRight, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/api/HomeApi";
import { getImageUrl } from "./dashboard/VenderView";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, selectedColor?: string) => void;
  onViewDetails: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);

  // Función para formatear la descripción manteniendo saltos de línea
  const formatDescription = (description: string): string => {
    if (!description) return "Sin descripción";
    
    // Normalizar saltos de línea para diferentes sistemas
    return description
      .replace(/\r\n/g, '\n')  // Windows a Unix
      .replace(/\r/g, '\n')    // Mac antiguo a Unix
      .replace(/\n+/g, '\n')   // Múltiples saltos a uno solo
      .trim();
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
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-card border-border/50 animate-fade-in-up flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-0 relative overflow-hidden">
        <div className="relative aspect-square bg-muted/30 w-full h-64 md:h-80">
          {/* Image Carousel con tamaño fijo */}
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <img
              src={getImageUrl(product.image)}
              alt={`${product.name} - imagen ${currentImageIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center'
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://static.vecteezy.com/system/resources/previews/011/781/801/non_2x/medicine-3d-render-icon-illustration-png.png';
              }}
            />
          </div>

          {/* Overlay con efectos */}
          <div className={`absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-bold">
                {product.category}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(product);
                }}
                className="bg-white/90 hover:bg-white text-primary border-none"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Stock badge */}
          <Badge className={`absolute top-2 right-2 ${
            product.stock === 0 ? 'bg-muted text-muted-foreground' : 'bg-green-500 text-white'
          }`}>
            {stockStatus.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3 flex-1">
        <div className="space-y-1">
          <CardTitle className="text-sm md:text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {product.name}
          </CardTitle>
          <div className="text-xs md:text-sm text-muted-foreground line-clamp-2 hidden md:block whitespace-pre-line leading-relaxed">
            {formatDescription(product.description)}
          </div>
        </div>

      </CardContent>

      <CardFooter className="p-3 md:p-4 pt-2 mt-auto border-t bg-muted/20">
        <div className="w-full flex flex-col space-y-2">
          {/* Price */}
          <div className="text-lg md:text-2xl font-black text-primary text-center">
            Bs. {product.price.toFixed(2)}
          </div>
          
          {/* View Product Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(product);
            }}
            className="w-full btn-neoled-secondary group text-xs md:text-sm h-9 md:h-10 py-1 md:py-2"
          >
            <Eye className="h-4 w-4 mr-0 md:mr-2 transition-transform duration-300 group-hover:scale-110" />
            <span className="hidden md:inline">Ver Producto</span>
            <span className="md:hidden">Ver</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}