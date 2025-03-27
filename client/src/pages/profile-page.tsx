import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimeCard } from '@/components/home/anime-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Play, Clock, Calendar } from 'lucide-react';
import { useAnimeById } from '@/hooks/use-anilist';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Update profile schema
const updateProfileSchema = z.object({
  username: z.string().min(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz' }),
  profilePicture: z.string().optional(),
});

// Update password schema
const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
  newPassword: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
  confirmPassword: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

// User preferences schema
const preferencesSchema = z.object({
  darkMode: z.boolean().default(true),
  subtitleLanguage: z.string().default('tr'),
  autoplay: z.boolean().default(true),
});

export default function ProfilePage(): React.JSX.Element {
  const [searchParams] = useLocation();
  const { user, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  // Get active tab from URL
  const params = new URLSearchParams(searchParams);
  const tabFromUrl = params.get('tab');
  const defaultTab = ['history', 'favorites', 'settings'].includes(tabFromUrl || '') 
    ? tabFromUrl 
    : 'profile';
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Get user's favorites
  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['/api/favorites'],
    enabled: !!user,
  });

  // Get user's watch history
  const { data: watchHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/watch-history'],
    enabled: !!user,
  });
  
  // Get user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/preferences'],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      profilePicture: user?.profilePicture || '',
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  // Preferences form
  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      darkMode: preferences?.darkMode || true,
      subtitleLanguage: preferences?.subtitleLanguage || 'tr',
      autoplay: true,
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture || '',
      });
    }
  }, [user, profileForm]);
  
  // Update preferences form when data loads
  useEffect(() => {
    if (preferences) {
      preferencesForm.reset({
        darkMode: preferences.darkMode,
        subtitleLanguage: preferences.subtitleLanguage,
        autoplay: true, // Default value, not stored in our schema
      });
    }
  }, [preferences, preferencesForm]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateProfileSchema>) => {
      await apiRequest("PUT", "/api/user", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profil güncellendi",
        description: "Profil bilgileriniz başarıyla güncellendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Profil güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updatePasswordSchema>) => {
      await apiRequest("PUT", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Şifre güncellendi",
        description: "Şifreniz başarıyla güncellendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Şifre güncellenirken bir hata oluştu. Mevcut şifrenizi kontrol edin.",
        variant: "destructive",
      });
    }
  });
  
  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesSchema>) => {
      await apiRequest("PUT", "/api/preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      toast({
        title: "Tercihler güncellendi",
        description: "Tercihleriniz başarıyla güncellendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Tercihler güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  });

  const onProfileSubmit = (values: z.infer<typeof updateProfileSchema>) => {
    updateProfileMutation.mutate(values);
  };

  const onPasswordSubmit = (values: z.infer<typeof updatePasswordSchema>) => {
    updatePasswordMutation.mutate(values);
  };
  
  const onPreferencesSubmit = (values: z.infer<typeof preferencesSchema>) => {
    updatePreferencesMutation.mutate(values);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // User should always exist due to ProtectedRoute, but we'll handle it anyway
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212]">
        <p className="text-white">Kullanıcı bilgilerine erişilemiyor.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />
      
      <div className="container mx-auto px-6 md:px-8 py-12">
        <div className="mb-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <Avatar className="w-24 h-24 border-4 border-primary">
            <AvatarImage src={user.profilePicture || "https://github.com/shadcn.png"} alt={user.username} />
            <AvatarFallback className="text-2xl">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="text-gray-400">Üyelik: {new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-[#2a2a2a] p-1 overflow-x-auto flex flex-nowrap whitespace-nowrap max-w-full">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="history">İzleme Geçmişi</TabsTrigger>
            <TabsTrigger value="favorites">Favoriler</TabsTrigger>
            <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">Profil Bilgileri</h2>
                
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kullanıcı Adı</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="kullaniciadi" 
                              {...field} 
                              className="bg-[#353535] border-[#454545] focus-visible:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="ornek@mail.com" 
                              {...field} 
                              className="bg-[#353535] border-[#454545] focus-visible:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="profilePicture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profil Resmi URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/avatar.jpg" 
                              {...field} 
                              className="bg-[#353535] border-[#454545] focus-visible:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-dark" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Profili Güncelle
                    </Button>
                  </form>
                </Form>
              </div>
              
              <div className="bg-[#2a2a2a] rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">Şifre Değiştir</h2>
                
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mevcut Şifre</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-[#353535] border-[#454545] focus-visible:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeni Şifre</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-[#353535] border-[#454545] focus-visible:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeni Şifre Tekrar</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-[#353535] border-[#454545] focus-visible:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-dark" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Şifreyi Güncelle
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
            
            <div className="bg-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Hesap İşlemleri</h2>
              
              <div className="space-y-4">
                <Button onClick={handleLogout} variant="destructive" className="w-full md:w-auto">
                  Çıkış Yap
                </Button>
              </div>
            </div>
          </TabsContent>
          
          {/* Watch History Tab */}
          <TabsContent value="history">
            <div className="bg-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">İzleme Geçmişi</h2>
              
              {historyLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full bg-[#353535]" />
                  ))}
                </div>
              ) : watchHistory?.length ? (
                <div className="space-y-4">
                  {watchHistory.map((history: any) => (
                    <WatchHistoryItem key={history.id} history={history} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Henüz izleme geçmişi bulunmuyor.</p>
                  <p className="text-gray-500 text-sm mt-2">Animeye başladığınızda burada görünecek.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <div className="bg-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Favoriler</h2>
              
              {favoritesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="aspect-[3/4] w-full mb-2 bg-[#353535]" />
                      <Skeleton className="h-5 w-full mb-2 bg-[#353535]" />
                      <Skeleton className="h-4 w-2/3 bg-[#353535]" />
                    </div>
                  ))}
                </div>
              ) : favorites?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favorites.map((favorite: any) => (
                    <FavoriteAnimeCard key={favorite.id} animeId={favorite.animeId} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Henüz favorilere eklenen anime bulunmuyor.</p>
                  <p className="text-gray-500 text-sm mt-2">Beğendiğiniz animeleri favorilere ekleyin.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="bg-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Uygulama Ayarları</h2>
              
              {preferencesLoading ? (
                <div className="space-y-6">
                  <Skeleton className="h-10 w-full bg-[#353535]" />
                  <Skeleton className="h-10 w-full bg-[#353535]" />
                  <Skeleton className="h-10 w-full bg-[#353535]" />
                </div>
              ) : (
                <Form {...preferencesForm}>
                  <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                    <FormField
                      control={preferencesForm.control}
                      name="darkMode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#454545] p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Karanlık Mod</FormLabel>
                            <p className="text-sm text-gray-400">
                              Karanlık tema tercihini ayarla
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={preferencesForm.control}
                      name="subtitleLanguage"
                      render={({ field }) => (
                        <FormItem className="flex flex-col rounded-lg border border-[#454545] p-4">
                          <FormLabel className="text-base">Altyazı Dili</FormLabel>
                          <p className="text-sm text-gray-400 mb-4">
                            Tercih ettiğiniz altyazı dilini seçin
                          </p>
                          <FormControl>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="tr-lang"
                                  value="tr"
                                  checked={field.value === 'tr'}
                                  onChange={() => field.onChange('tr')}
                                  className="w-4 h-4 accent-primary"
                                />
                                <Label htmlFor="tr-lang">Türkçe</Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="en-lang"
                                  value="en"
                                  checked={field.value === 'en'}
                                  onChange={() => field.onChange('en')}
                                  className="w-4 h-4 accent-primary"
                                />
                                <Label htmlFor="en-lang">İngilizce</Label>
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={preferencesForm.control}
                      name="autoplay"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#454545] p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Otomatik Oynatma</FormLabel>
                            <p className="text-sm text-gray-400">
                              Bölümler arasında otomatik geçiş yap
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary-dark" 
                      disabled={updatePreferencesMutation.isPending}
                    >
                      {updatePreferencesMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Ayarları Kaydet
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
}

// Watch History Item Component
function WatchHistoryItem({ history }: { history: any }): React.JSX.Element {
  const { data: anime, isLoading } = useAnimeById(history.animeId);
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return <Skeleton className="h-24 w-full bg-[#353535]" />;
  }
  
  if (!anime) return null;
  
  // Calculate completion percentage
  const completionPercentage = Math.min((history.progress / history.duration) * 100, 100);
  
  // Format date
  const lastWatched = new Date(history.lastWatched);
  const formattedDate = lastWatched.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return (
    <div 
      className="flex flex-col sm:flex-row gap-4 bg-[#353535] rounded-lg p-4 cursor-pointer hover:bg-[#454545] transition-colors"
      onClick={() => setLocation(`/izle/${history.animeId}/${history.episodeId}`)}
    >
      <div className="w-full sm:w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <img 
          src={anime.coverImage?.large || anime.coverImage?.medium} 
          alt={anime.title?.turkish || anime.title?.romaji} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1">
        <h3 className="font-bold">{anime.title?.turkish || anime.title?.romaji}</h3>
        <p className="text-sm text-gray-300">Bölüm {history.episodeId}</p>
        
        <div className="flex flex-col sm:flex-row sm:items-center mt-2 text-xs text-gray-400 gap-2 sm:gap-4">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{Math.floor(history.progress / 60)}:{(history.progress % 60).toString().padStart(2, '0')} / {Math.floor(history.duration / 60)}:{(history.duration % 60).toString().padStart(2, '0')}</span>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <div className="mt-2 w-full bg-[#252525] rounded-full h-1">
          <div 
            className="bg-primary h-full rounded-full" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <Button size="sm" variant="ghost" className="rounded-full h-10 w-10 p-0">
          <Play className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// Favorite Anime Card Component
function FavoriteAnimeCard({ animeId }: { animeId: number }): React.JSX.Element {
  const { data: anime, isLoading } = useAnimeById(animeId);
  
  if (isLoading) {
    return (
      <div>
        <Skeleton className="aspect-[3/4] w-full mb-2 bg-[#353535]" />
        <Skeleton className="h-5 w-full mb-2 bg-[#353535]" />
        <Skeleton className="h-4 w-2/3 bg-[#353535]" />
      </div>
    );
  }
  
  if (!anime) return null;
  
  return (
    <AnimeCard 
      id={anime.id}
      title={anime.title?.turkish || anime.title?.romaji || anime.title?.english || ''}
      image={anime.coverImage?.extraLarge || anime.coverImage?.large || ''}
      score={anime.averageScore ? (anime.averageScore / 10).toFixed(1) : undefined}
      genres={anime.genres || []}
    />
  );
}
