import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardSidebar } from "@/components/DashboardSidebar"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useState, useMemo } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Check, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  marginTop: '20px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 28.5383,
  lng: -81.3792,
};

const mapOptions = {
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoom: 9,
  styles: [
    {
      featureType: "all",
      elementType: "labels.text.fill",
      stylers: [{ color: "#000000" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#e9e9e9" }]
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f5f5f5" }]
    }
  ]
};

export const Dashboard = () => {
  const [selectedZips, setSelectedZips] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(9);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leadsCount, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['propertiesCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('Propiedades')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      return count || 0;
    }
  });

  const { data: uniqueZipCount, isLoading: isLoadingZips } = useQuery({
    queryKey: ['uniqueZipCodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Propiedades')
        .select('address_zip')
        .not('address_zip', 'is', null);
      
      if (error) throw error;
      const uniqueZips = new Set(data.map(item => item.address_zip));
      return uniqueZips.size;
    }
  });

  const { data: scoreDistribution, isLoading: isLoadingScores } = useQuery({
    queryKey: ['scoreDistribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Propiedades')
        .select('combined_score');

      if (error) throw error;

      const distribution = data.reduce((acc: Record<number, number>, curr) => {
        if (curr.combined_score) {
          acc[curr.combined_score] = (acc[curr.combined_score] || 0) + 1;
        }
        return acc;
      }, {});

      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      return Object.entries(distribution).map(([score, count]) => ({
        score: `Score ${score}`,
        count,
        percentage: Math.round((count / total) * 100)
      }));
    }
  });

  const { data: availableZipCodes } = useQuery({
    queryKey: ['availableZipCodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Propiedades')
        .select('address_zip')
        .not('address_zip', 'is', null);
      
      if (error) throw error;
      const uniqueZips = Array.from(new Set(data.map(item => item.address_zip))).sort();
      return uniqueZips;
    }
  });

  const { data: properties } = useQuery({
    queryKey: ['properties', selectedZips],
    queryFn: async () => {
      let query = supabase
        .from('Propiedades')
        .select('address_latitude, address_longitude, address_formattedStreet');
      
      if (selectedZips.length > 0) {
        query = query.in('address_zip', selectedZips.map(zip => parseInt(zip, 10)));
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const avgLat = data.reduce((sum, prop) => sum + (prop.address_latitude || 0), 0) / data.length;
        const avgLng = data.reduce((sum, prop) => sum + (prop.address_longitude || 0), 0) / data.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
        setMapZoom(12);
      } else {
        setMapCenter(defaultCenter);
        setMapZoom(9);
      }

      return data;
    }
  });

  const markers = useMemo(() => {
    return properties?.map((property, index) => ({
      position: {
        lat: property.address_latitude || 0,
        lng: property.address_longitude || 0,
      },
      title: property.address_formattedStreet || `Property ${index + 1}`,
    })) || [];
  }, [properties]);

  const filteredZipCodes = useMemo(() => {
    if (!availableZipCodes) return [];
    return availableZipCodes.filter(zip => 
      zip.toString().includes(searchQuery)
    );
  }, [availableZipCodes, searchQuery]);

  const handleZipSelect = (zip: string) => {
    setSelectedZips(prev => {
      if (zip === 'all') return [];
      if (prev.includes(zip)) {
        return prev.filter(z => z !== zip);
      }
      return [...prev, zip];
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedZips(availableZipCodes?.map(zip => zip.toString()) || []);
    } else {
      setSelectedZips([]);
    }
  };

  return (
    <DashboardSidebar>
      <div className="min-h-screen bg-secondary p-6">
        <div className="container mx-auto">
          <h1 className="text-4xl font-inter font-semibold tracking-tight mb-8">Summary</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cantidad de potenciales leads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {isLoadingLeads ? "Cargando..." : leadsCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Códigos Zips mapeados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {isLoadingZips ? "Cargando..." : uniqueZipCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score de propiedades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingScores ? (
                  <p className="text-center">Cargando...</p>
                ) : (
                  scoreDistribution?.map((item) => (
                    <div key={item.score} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.score}</span>
                        <span>{item.percentage}%</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-6">Segmentación de Propiedades</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">
                  Seleccione uno o más códigos postales:
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar código postal..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[300px] px-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedZips.length === availableZipCodes?.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Seleccionar todos
                      </label>
                    </div>
                    <Separator className="my-2" />
                    {filteredZipCodes.map((zip) => (
                      <div key={zip} className="flex items-center space-x-2">
                        <Checkbox
                          id={`zip-${zip}`}
                          checked={selectedZips.includes(zip.toString())}
                          onCheckedChange={() => handleZipSelect(zip.toString())}
                        />
                        <label
                          htmlFor={`zip-${zip}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {zip}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="lg:col-span-3">
              <LoadScript googleMapsApiKey="AIzaSyC2q-Pl2npZHP0T33HBbZpstTJE3UDWPog">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  options={mapOptions}
                >
                  {markers.map((marker, index) => (
                    <Marker
                      key={index}
                      position={marker.position}
                      title={marker.title}
                    />
                  ))}
                </GoogleMap>
              </LoadScript>
            </div>
          </div>
        </div>
      </div>
    </DashboardSidebar>
  );
};
