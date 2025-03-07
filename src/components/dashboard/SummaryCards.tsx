
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const SummaryCards = () => {
  const { data: leadsCount, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['propertiesCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('Propiedades')
        .select('*', { count: 'exact' });
      
      if (error) {
        console.error('Error obteniendo conteo de propiedades:', error);
        throw error;
      }
      console.log('Total de propiedades:', count);
      return count || 0;
    }
  });

  const { data: uniqueZipCount, isLoading: isLoadingZips } = useQuery({
    queryKey: ['uniqueZipCodes'],
    queryFn: async () => {
      console.log('Iniciando consulta de códigos ZIP...');
      
      // Obtener el conteo total primero
      const { count: totalCount } = await supabase
        .from('Propiedades')
        .select('*', { count: 'exact', head: true });
      
      console.log('Total de registros en la tabla:', totalCount);
      
      // Realizar consultas paginadas
      const pageSize = 1000;
      const pages = Math.ceil((totalCount || 0) / pageSize);
      const allZips = new Set<number>();
      
      for (let page = 0; page < pages; page++) {
        const { data, error } = await supabase
          .from('Propiedades')
          .select('address_zip')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          console.error('Error en página', page, error);
          continue;
        }
        
        if (data) {
          data.forEach(item => {
            if (item.address_zip != null) {
              allZips.add(item.address_zip);
            }
          });
        }
        
        console.log(`Página ${page + 1}/${pages} procesada, ZIP codes únicos hasta ahora:`, allZips.size);
      }
      
      console.log('ZIP codes únicos encontrados:', Array.from(allZips));
      console.log('Número total de ZIP codes únicos:', allZips.size);
      
      return allZips.size;
    },
    refetchOnMount: true,
    staleTime: 0
  });

  const { data: scoreDistribution, isLoading: isLoadingScores } = useQuery({
    queryKey: ['scoreDistribution'],
    queryFn: async () => {
      // También implementamos paginación aquí
      const { count: totalCount } = await supabase
        .from('Propiedades')
        .select('*', { count: 'exact', head: true });
      
      const pageSize = 1000;
      const pages = Math.ceil((totalCount || 0) / pageSize);
      const distribution: Record<number, number> = {};
      
      for (let page = 0; page < pages; page++) {
        const { data, error } = await supabase
          .from('Propiedades')
          .select('combined_score')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          console.error('Error en página', page, error);
          continue;
        }
        
        if (data) {
          data.forEach(item => {
            if (item.combined_score) {
              distribution[item.combined_score] = (distribution[item.combined_score] || 0) + 1;
            }
          });
        }
      }

      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      return Object.entries(distribution).map(([score, count]) => ({
        score: `Score ${score}`,
        count,
        percentage: Math.round((count / total) * 100),
        color: score === '1' ? '#ea384c' : score === '2' ? '#F97316' : '#008f39'
      }));
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs">Cantidad de potenciales leads</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-20">
          <p className="text-4xl font-bold text-primary">
            {isLoadingLeads ? "Cargando..." : leadsCount}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs">Códigos Zips mapeados</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-20">
          <p className="text-4xl font-bold text-primary">
            {isLoadingZips ? "Cargando..." : uniqueZipCount}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs">Score de propiedades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoadingScores ? (
            <p className="text-center text-xs">Cargando...</p>
          ) : (
            scoreDistribution?.map((item) => (
              <div key={item.score} className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span>{item.score}</span>
                  <span>{item.percentage}%</span>
                </div>
                <Progress 
                  value={item.percentage} 
                  className={cn("h-1")}
                  indicatorClassName={cn("transition-all", {
                    "bg-[#ea384c]": item.score === "Score 1",
                    "bg-[#F97316]": item.score === "Score 2",
                    "bg-[#008f39]": item.score === "Score 3"
                  })}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
