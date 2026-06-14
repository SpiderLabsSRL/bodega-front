import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface FilterOptions {
  category: string;
}

interface ProductFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  categories: string[];
}

const DEFAULT_FILTERS: FilterOptions = {
  category: "all"
};

export function ProductFilters({ onFiltersChange, categories }: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  };

const hasActiveFilters = () => {
  return (
    filters.category !== "all"
  );
};

const getActiveFiltersCount = () => {
  let count = 0;
  if (filters.category !== "all") count++;
  return count;
};

  return (
    <Card className="sticky top-24 animate-fade-in-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Filter className="h-5 w-5" />
            Filtros
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="lg:hidden"
            >
              {isExpanded ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`space-y-6 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
        {/* Categoría */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-foreground">Categoría</Label>
          <Select value={filters.category} onValueChange={(value) => updateFilters({ category: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {hasActiveFilters() && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">Filtros Activos</Label>
              <div className="flex flex-wrap gap-2">
                {filters.category !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.category}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-secondary-foreground hover:text-destructive"
                      onClick={() => updateFilters({ category: "all" })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}