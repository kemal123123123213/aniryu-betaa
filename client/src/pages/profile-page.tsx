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
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimeCard } from '@/components/home/anime-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Play, Clock, Calendar, Star, Heart } from 'lucide-react';
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
  const { user, isLoading, logoutMutation } = useAuth() as { 
    user: { 
      id: number; 
      username: string; 
      email: string; 
      profilePicture?: string | null; 
      role: string;
      isAdmin?: boolean;
      createdAt: Date;
    } | null;
    isLoading: boolean;
    logoutMutation: any;
  };
  const { toast } = useToast();
  
  // Get active tab from URL
  const params = new URLSearchParams(searchParams);
  const tabFromUrl = params.get('tab');
  const defaultTab = ['history', 'favorites', 'settings'].includes(tabFromUrl || '') 
    ? tabFromUrl 
    : 'profile';
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Get user's favorites
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
    enabled: !!user,
  });

  // Get user's watch history
  const { data: watchHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ['/api/watch-history'],
    enabled: !!user,
  });
  
  // Get user preferences
  const { data: preferences = { darkMode: true, subtitleLanguage: 'tr', autoplay: true }, isLoading: preferencesLoading } = useQuery<{
    darkMode: boolean;
    subtitleLanguage: string;
    autoplay: boolean;
  }>({
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
      
      {/* Profile Banner Background */}
      <div className="relative h-60 w-full bg-gradient-to-r from-violet-900/50 via-primary/30 to-blue-900/50">
        <div className="absolute inset-0 bg-[url('https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/coast-landscape-2.png')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
      </div>
        
      <div className="container mx-auto px-6 md:px-8 -mt-20 relative z-10">
        <div className="mb-8 flex flex-col md:flex-row gap-8 items-start">
          <Avatar className="w-32 h-32 border-4 border-primary rounded-2xl shadow-lg shadow-primary/30">
            <AvatarImage src={user.profilePicture || "https://github.com/shadcn.png"} alt={user.username || "User"} />
            <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-purple-700">{user.username ? user.username.substring(0, 2).toUpperCase() : "U"}</AvatarFallback>
          </Avatar>
          
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{user.username || "User"}</h1>
              {user.role === 'admin' && (
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  ADMİN
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-gray-400">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Üyelik: {new Date(user.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{watchHistory.length} Anime İzlendi</span>
              </div>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="relative">
            <div className="absolute -bottom-[1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            <TabsList className="bg-transparent border-b border-gray-800 p-0 overflow-x-auto flex flex-nowrap whitespace-nowrap max-w-full gap-6">
              <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profil
                </span>
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  İzleme Geçmişi
                </span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
                <span className="flex items-center">
                  <Heart className="h-4 w-4 mr-2" />
                  Favoriler
                </span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ayarlar
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
          
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
  
  if (!anime) {
    return (
      <div className="flex flex-col gap-2 bg-[#353535] rounded-lg p-4">
        <p className="text-gray-400">Anime bilgisi bulunamadı</p>
      </div>
    );
  }
  
  // Calculate completion percentage
  const completionPercentage = Math.min((history.progress / history.duration) * 100, 100);
  const isCompleted = history.completed || completionPercentage > 95;
  
  // Format date
  const lastWatched = new Date(history.lastWatched);
  const formattedDate = lastWatched.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate time difference
  const getTimeDifference = () => {
    const now = new Date();
    const diff = now.getTime() - lastWatched.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Bugün';
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;
    if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
    if (days < 365) return `${Math.floor(days / 30)} ay önce`;
    return `${Math.floor(days / 365)} yıl önce`;
  };
  
  return (
    <div 
      className="group flex flex-col sm:flex-row gap-4 bg-[#252525] rounded-xl p-4 cursor-pointer hover:bg-gradient-to-r hover:from-[#2a2a2a] hover:to-[#353535] transition-all duration-300 border border-transparent hover:border-primary/20 shadow-md hover:shadow-primary/10"
      onClick={() => setLocation(`/izle/${history.animeId}/${history.episodeId}`)}
    >
      <div className="relative w-full sm:w-40 h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img 
          src={anime.coverImage?.large || anime.coverImage?.medium} 
          alt={anime.title?.turkish || anime.title?.romaji} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-primary rounded-full p-2 transform group-hover:scale-110 transition-transform">
            <Play className="h-5 w-5 text-white" />
          </div>
        </div>
        
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            Tamamlandı
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{anime.title?.turkish || anime.title?.romaji}</h3>
          <Badge variant="outline" className="bg-[#353535] text-gray-300 border-none">
            {getTimeDifference()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <Badge className="bg-primary/90 hover:bg-primary text-white">Bölüm {history.episodeId}</Badge>
          {anime.genres && anime.genres.length > 0 && (
            <span className="text-xs text-gray-400">{anime.genres.slice(0, 2).join(', ')}</span>
          )}
        </div>
        
        <div className="flex items-center mt-3 text-xs text-gray-400 gap-4">
          <div className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-primary/80" />
            <span>{formatTime(history.progress)} / {formatTime(history.duration)}</span>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary/80" />
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <div className="w-full h-1.5 bg-gray-700 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-violet-600" 
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Favorite Anime Card Component
function FavoriteAnimeCard({ animeId }: { animeId: number }): React.JSX.Element {
  const { data: anime, isLoading } = useAnimeById(animeId);
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div>
        <Skeleton className="aspect-[3/4] w-full mb-2 bg-[#353535] rounded-xl" />
        <Skeleton className="h-5 w-full mb-2 bg-[#353535] rounded-lg" />
        <Skeleton className="h-4 w-2/3 bg-[#353535] rounded-lg" />
      </div>
    );
  }
  
  if (!anime) return <></>;
  
  // Format score for display with stars
  const formatScore = () => {
    if (!anime.averageScore) return <></>;
    
    const score = anime.averageScore / 10;
    return (
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        <span className="text-yellow-400 font-medium">{score.toFixed(1)}</span>
      </div>
    );
  };
  
  return (
    <div 
      className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
      onClick={() => setLocation(`/anime/${anime.id}`)}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
        <img 
          src={anime.coverImage?.extraLarge || anime.coverImage?.large || ''} 
          alt={anime.title?.turkish || anime.title?.romaji || anime.title?.english || ''} 
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Hover overlay with additional info */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-between">
            {formatScore()}
            
            <Badge variant="outline" className="bg-black/50 text-white border-none text-xs">
              {anime.format || 'TV'}
            </Badge>
          </div>
          
          <Button variant="ghost" size="sm" className="mt-2 w-full bg-primary/80 text-white hover:bg-primary hover:text-white">
            <Play className="mr-2 h-4 w-4" /> İzle
          </Button>
        </div>
      </div>
      
      <div className="p-2">
        <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {anime.title?.turkish || anime.title?.romaji || anime.title?.english || ''}
        </h3>
        
        <div className="mt-1 flex flex-wrap gap-1">
          {(anime.genres || []).slice(0, 2).map((genre, index) => (
            <span key={index} className="text-xs text-gray-400">
              {index > 0 && '• '}{genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
