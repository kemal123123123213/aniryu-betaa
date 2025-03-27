import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Brain, LoaderCircle, BookOpen } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getQueryFn } from '@/lib/queryClient';

interface AIAnalysisProps {
  animeId: number;
  title: string;
  genres: string[];
}

export function AIAnalysis({ animeId, title, genres }: AIAnalysisProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('summary');
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // Clean up genres - make sure we have a valid array
  const cleanGenres: string[] = Array.isArray(genres) ? genres : [];

  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<{ summary: string; characterAnalysis: string }>({
    queryKey: [`/api/ai/anime-analysis?animeId=${animeId}&title=${encodeURIComponent(title)}&genres=${encodeURIComponent(cleanGenres.join(','))}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: false // We'll trigger this manually
  });
  
  const handleGetAnalysis = () => {
    if (!user) {
      toast({
        title: "Giriş yapmalısınız",
        description: "AI anime analizi özelliğini kullanmak için lütfen giriş yapın",
        variant: "destructive"
      });
      return;
    }
    
    setShowAnalysis(true);
    refetch();
  };
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Analiz yüklenemedi",
        description: "Anime analizi yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  if (!showAnalysis) {
    return (
      <Card className="bg-[#2a2a2a] border-none shadow-lg mt-8">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Tarafından Oluşturulmuş Anime Analizi
          </CardTitle>
          <CardDescription className="text-gray-300">
            Yapay zeka teknolojisi ile oluşturulmuş detaylı anime analizi ve karakter incelemeleri
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-2 pb-10">
          <p className="text-gray-300 mb-6">
            Bu anime hakkında yapay zeka tarafından oluşturulmuş özgün analiz ve karakter incelemelerini görüntüleyin
          </p>
          <Button 
            onClick={handleGetAnalysis} 
            variant="default" 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Analizi Göster
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-[#2a2a2a] border-none shadow-lg mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Tarafından Oluşturulmuş Anime Analizi
        </CardTitle>
        <CardDescription className="text-gray-300">
          Yapay zeka teknolojisi ile oluşturulmuş detaylı anime analizi ve karakter incelemeleri
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-[#3a3a3a]">
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:block">Anime Analizi</span>
                <span className="sm:hidden">Analiz</span>
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:block">Karakter İncelemesi</span>
                <span className="sm:hidden">Karakterler</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="mt-4">
              <div className="prose prose-invert max-w-none">
                <div className="text-sm md:text-base text-gray-200 whitespace-pre-line">
                  {data.summary}
                </div>
                <p className="text-xs text-gray-400 mt-4 italic">
                  Bu analiz yapay zeka tarafından oluşturulmuştur ve öznel yorumlar içerebilir.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="characters" className="mt-4">
              <div className="prose prose-invert max-w-none">
                <div className="text-sm md:text-base text-gray-200 whitespace-pre-line">
                  {data.characterAnalysis}
                </div>
                <p className="text-xs text-gray-400 mt-4 italic">
                  Bu karakter analizi yapay zeka tarafından oluşturulmuştur ve karakterlerin resmi özellikleriyle farklılık gösterebilir.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-gray-400">
            Analiz yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
          </div>
        )}
      </CardContent>
    </Card>
  );
}