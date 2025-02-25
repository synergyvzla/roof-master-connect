
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PriceRangeFilterProps {
  priceRange: number[];
  setPriceRange: (value: number[]) => void;
}

export const PriceRangeFilter = ({ priceRange, setPriceRange }: PriceRangeFilterProps) => {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-2">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="minPrice" className="text-[10px]">Mínimo</Label>
              <Input
                id="minPrice"
                type="number"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                min={250000}
                max={priceRange[1]}
                step={10000}
                className="h-6 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPrice" className="text-[10px]">Máximo</Label>
              <Input
                id="maxPrice"
                type="number"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                min={priceRange[0]}
                max={2500000}
                step={10000}
                className="h-6 text-xs"
              />
            </div>
          </div>
          <div className="pt-1">
            <Slider
              min={250000}
              max={2500000}
              step={10000}
              value={[priceRange[0], priceRange[1]]}
              onValueChange={setPriceRange}
              className="w-full"
              defaultValue={[priceRange[0], priceRange[1]]}
              thumbs={2}
            />
            <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground">
              <span>{formatPrice(250000)}</span>
              <span>{formatPrice(2500000)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
