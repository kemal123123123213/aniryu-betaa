import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, LoaderCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getQueryFn } from '@/lib/queryClient';
import { Link } from 'wouter';

export function AiWhatToWatch() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  
  const { data, isLoading, error, refetch } = useQuery<{ recommendation: string }>({
    queryKey: ['/api/ai/what-to-watch'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: false // Manually control when this query runs
  });
  
  const handleGetRecommendation = async () => {
    if (!user) {
      toast({
        title: "Giriş yapmalısınız",
        description: "Bu özelliği kullanmak için lütfen giriş yapın",
        variant: "destructive"
      });
      return;
    }
    
    setShowRecommendation(true);
    refetch();
  };
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Öneri alınamadı",
        description: "Yapay zeka önerisi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
      setShowRecommendation(false);
    }
  }, [error, toast]);
  
  return (
    <div className="mt-10 mb-8 px-4 md:px-6 lg:px-8">
      <Card className="bg-gradient-to-r from-indigo-900/70 to-purple-900/70 border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Bugün Ne İzlemeli?
          </CardTitle>
          <CardDescription className="text-gray-300">
            Yapay zeka destekli kişiselleştirilmiş günlük anime önerisi
          </CardDescription>
        </CardHeader>
        
        {showRecommendation ? (
          <CardContent className="pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : data?.recommendation ? (
              <div className="prose prose-invert max-w-none">
                <div className={expanded ? "text-base" : "text-base line-clamp-6"}>
                  {data.recommendation}
                </div>
                {data.recommendation.length > 300 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExpanded(!expanded)} 
                    className="mt-2 text-primary hover:text-primary-focus"
                  >
                    {expanded ? "Daha az göster" : "Devamını oku"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-gray-300 italic">Öneri hazırlanıyor...</p>
            )}
          </CardContent>
        ) : (
          <CardContent className="text-center py-6">
            <p className="text-gray-300 mb-4">
              Yapay zeka asistanımız sizin için bugün izlemeniz gereken en iyi animeyi seçsin!
            </p>
            <Button 
              onClick={handleGetRecommendation} 
              variant="default" 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              Bana öner
            </Button>
          </CardContent>
        )}
        
        <CardFooter className="pt-0 justify-end">
          <Link href="/kategori/all">
            <Button variant="link" className="text-primary-focus flex items-center">
              Tüm animeleri gör
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export function AiPersonalizedRecommendations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  
  const { data, isLoading, error } = useQuery<{ recommendations: string }>({
    queryKey: ['/api/ai/recommendations'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user, // Only run if user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Öneriler alınamadı",
        description: "Kişiselleştirilmiş öneriler alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  if (!user) return null;
  
  return (
    <div className="my-10 px-4 md:px-6 lg:px-8">
      <Card className="bg-gradient-to-r from-blue-900/70 to-violet-900/70 border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white">
            <Sparkles className="w-5 h-5 text-blue-400" />
            AI Kişiselleştirilmiş Öneriler
          </CardTitle>
          <CardDescription className="text-gray-300">
            İzleme alışkanlıklarınıza göre özel olarak seçilen animeler
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.recommendations ? (
            <div className="prose prose-invert max-w-none">
              <div className={expanded ? "text-base" : "text-base line-clamp-12"}>
                {data.recommendations}
              </div>
              {data.recommendations.length > 400 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setExpanded(!expanded)} 
                  className="mt-2 text-primary hover:text-primary-focus"
                >
                  {expanded ? "Daha az göster" : "Devamını oku"}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-gray-300 italic">Henüz kişiselleştirilmiş öneri yok. Daha fazla anime izledikçe öneriler daha isabetli olacak.</p>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 justify-end">
          <Link href="/kategori/all">
            <Button variant="link" className="text-primary-focus flex items-center">
              Tüm animeleri gör
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}