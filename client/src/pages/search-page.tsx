import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AnimeCard } from '@/components/home/anime-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useSearchAnime } from '@/hooks/use-anilist';

export default function SearchPage() {
  const [searchParams, setLocation] = useLocation();
  const params = new URLSearchParams(searchParams);
  
  // Extract query parameters
  const initialQuery = params.get('q') || '';
  const initialGenre = params.get('genre') || '';
  const initialYear = params.get('year') ? parseInt(params.get('year') || '') : undefined;
  const initialSort = params.get('sort') || 'POPULARITY_DESC';
  
  // State for search filters
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [inputQuery, setInputQuery] = useState(initialQuery); // For controlled input
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear?.toString() || '');
  const [selectedSort, setSelectedSort] = useState(initialSort);
  
  // Search results using the hook
  const { data: searchResults, isLoading, error } = useSearchAnime(searchQuery);
  
  // Set page title
  useEffect(() => {
    document.title = searchQuery 
      ? `${searchQuery} - AnimeMax Arama Sonuçları` 
      : 'Anime Ara - AnimeMax';
  }, [searchQuery]);
  
  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputQuery);
    updateUrlParams(inputQuery, selectedGenre, selectedYear, selectedSort);
  };
  
  // Update URL parameters
  const updateUrlParams = (query: string, genre: string, year: string, sort: string) => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    if (year) params.set('year', year);
    if (sort) params.set('sort', sort);
    
    setLocation(`/ara?${params.toString()}`);
  };
  
  // Apply filters
  const applyFilters = () => {
    setSearchQuery(inputQuery);
    updateUrlParams(inputQuery, selectedGenre, selectedYear, selectedSort);
  };
  
  // Reset filters
  const resetFilters = () => {
    setSelectedGenre('');
    setSelectedYear('');
    setSelectedSort('POPULARITY_DESC');
  };
  
  // Filter anime based on selected criteria
  const filteredResults = searchResults?.filter(anime => {
    let matchesGenre = true;
    let matchesYear = true;
    
    if (selectedGenre && anime.genres) {
      matchesGenre = anime.genres.includes(selectedGenre);
    }
    
    if (selectedYear && anime.startDate?.year) {
      matchesYear = anime.startDate.year === parseInt(selectedYear);
    }
    
    return matchesGenre && matchesYear;
  }) || [];
  
  // Sort results based on selected criteria
  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (selectedSort) {
      case 'TITLE_ASC':
        return (a.title?.romaji || '').localeCompare(b.title?.romaji || '');
      case 'TITLE_DESC':
        return (b.title?.romaji || '').localeCompare(a.title?.romaji || '');
      case 'SCORE_DESC':
        return (b.averageScore || 0) - (a.averageScore || 0);
      case 'POPULARITY_DESC':
        return (b.popularity || 0) - (a.popularity || 0);
      case 'TRENDING_DESC':
        return ((b.trending || 0) - (a.trending || 0));
      case 'START_DATE_DESC':
        const bYear = b.startDate?.year || 0;
        const aYear = a.startDate?.year || 0;
        return bYear - aYear;
      default:
        return 0;
    }
  });
  
  // Generate years for dropdown
  const years = Array.from({ length: new Date().getFullYear() - 1989 + 1 }, (_, i) => new Date().getFullYear() - i);
  
  // Available genres
  const genres = [
    "Aksiyon", "Macera", "Komedi", "Drama", "Ecchi", "Fantezi", "Oyun", 
    "Harem", "Hentai", "Tarih", "Korku", "Çocuk", "Büyü", "Dövüş Sanatları", 
    "Mecha", "Müzik", "Gizem", "Psikolojik", "Romantik", "Bilim Kurgu", "Slice of Life", 
    "Spor", "Doğaüstü", "Gerilim"
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      
      <div className="container mx-auto px-6 md:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Anime Ara</h1>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="text-gray-300 border-gray-600">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtreler
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#1e1e1e] text-white border-l border-[#3a3a3a]">
              <SheetHeader>
                <SheetTitle className="text-white">Arama Filtreleri</SheetTitle>
                <SheetDescription className="text-gray-400">
                  Sonuçları detaylı filtrelemek için aşağıdaki seçenekleri kullanın.
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Tür</label>
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a]">
                      <SelectValue placeholder="Tür seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                      <SelectItem value="">Tüm Türler</SelectItem>
                      {genres.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Yıl</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a]">
                      <SelectValue placeholder="Yıl seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white max-h-80">
                      <SelectItem value="">Tüm Yıllar</SelectItem>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Sıralama</label>
                  <Select value={selectedSort} onValueChange={setSelectedSort}>
                    <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a]">
                      <SelectValue placeholder="Sıralama seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                      <SelectItem value="POPULARITY_DESC">Popülerlik</SelectItem>
                      <SelectItem value="SCORE_DESC">Puan (Yüksek-Düşük)</SelectItem>
                      <SelectItem value="TITLE_ASC">İsim (A-Z)</SelectItem>
                      <SelectItem value="TITLE_DESC">İsim (Z-A)</SelectItem>
                      <SelectItem value="START_DATE_DESC">En Yeni</SelectItem>
                      <SelectItem value="TRENDING_DESC">Trend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <SheetFooter className="mt-8">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  Filtreleri Sıfırla
                </Button>
                <SheetClose asChild>
                  <Button onClick={applyFilters} className="bg-primary hover:bg-primary-dark">
                    Filtreleri Uygula
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Search input */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Anime ara..."
              className="bg-[#2a2a2a] border-[#3a3a3a] pr-24 focus-visible:ring-primary h-12 text-base"
            />
            {inputQuery && (
              <button 
                type="button"
                className="absolute right-[90px] top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setInputQuery('')}
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <Button 
              type="submit" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary-dark h-8"
            >
              <Search className="h-4 w-4 mr-2" />
              Ara
            </Button>
          </div>
        </form>
        
        {/* Active filters */}
        {(selectedGenre || selectedYear || selectedSort !== 'POPULARITY_DESC') && (
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="text-sm text-gray-400 mr-2 flex items-center">
              Aktif Filtreler:
            </div>
            
            {selectedGenre && (
              <div className="bg-[#2a2a2a] text-sm text-white rounded-full px-3 py-1 flex items-center">
                Tür: {selectedGenre}
                <button 
                  onClick={() => {
                    setSelectedGenre('');
                    updateUrlParams(inputQuery, '', selectedYear, selectedSort);
                  }}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {selectedYear && (
              <div className="bg-[#2a2a2a] text-sm text-white rounded-full px-3 py-1 flex items-center">
                Yıl: {selectedYear}
                <button 
                  onClick={() => {
                    setSelectedYear('');
                    updateUrlParams(inputQuery, selectedGenre, '', selectedSort);
                  }}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {selectedSort !== 'POPULARITY_DESC' && (
              <div className="bg-[#2a2a2a] text-sm text-white rounded-full px-3 py-1 flex items-center">
                Sıralama: {
                  selectedSort === 'SCORE_DESC' ? 'Puan' :
                  selectedSort === 'TITLE_ASC' ? 'İsim (A-Z)' :
                  selectedSort === 'TITLE_DESC' ? 'İsim (Z-A)' :
                  selectedSort === 'START_DATE_DESC' ? 'En Yeni' :
                  selectedSort === 'TRENDING_DESC' ? 'Trend' : 'Popülerlik'
                }
                <button 
                  onClick={() => {
                    setSelectedSort('POPULARITY_DESC');
                    updateUrlParams(inputQuery, selectedGenre, selectedYear, 'POPULARITY_DESC');
                  }}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <Button 
              variant="link" 
              onClick={resetFilters} 
              className="text-primary text-sm p-0 h-auto"
            >
              Tümünü Temizle
            </Button>
          </div>
        )}
        
        {/* Search results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full mb-2 bg-[#2a2a2a]" />
                <Skeleton className="h-5 w-full mb-2 bg-[#2a2a2a]" />
                <Skeleton className="h-4 w-2/3 bg-[#2a2a2a]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-300 mb-4">Bir hata oluştu</p>
            <p className="text-gray-400">Lütfen daha sonra tekrar deneyin.</p>
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="text-center py-20">
            {searchQuery ? (
              <>
                <p className="text-xl text-gray-300 mb-4">"{searchQuery}" için sonuç bulunamadı</p>
                <p className="text-gray-400">Farklı bir arama terimi deneyin veya filtreleri değiştirin.</p>
              </>
            ) : (
              <>
                <p className="text-xl text-gray-300 mb-4">Anime aramak için yukarıdaki arama kutusunu kullanın</p>
                <p className="text-gray-400">Animeleri adına, türüne veya konusuna göre arayabilirsiniz.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-gray-400 mb-6">
              {searchQuery ? (
                <>{sortedResults.length} anime bulundu</>
              ) : (
                <>Tüm animeler gösteriliyor</>
              )}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {sortedResults.map(anime => (
                <AnimeCard
                  key={anime.id}
                  id={anime.id}
                  title={anime.title?.turkish || anime.title?.romaji || anime.title?.english || ''}
                  image={anime.coverImage?.extraLarge || anime.coverImage?.large || ''}
                  score={anime.averageScore ? (anime.averageScore / 10).toFixed(1) : undefined}
                  genres={anime.genres || []}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
