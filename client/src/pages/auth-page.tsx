import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

// Extended validation schema for registration
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

// Login schema
const loginSchema = z.object({
  username: z.string().min(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [, setLocation] = useLocation();
  
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);
  
  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      profilePicture: '',
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* Form section */}
        <div className="flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-16">
          <div className="mb-8 flex items-center">
            <svg className="w-8 h-8 text-primary mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M11,8V16L16,12L11,8Z" />
            </svg>
            <h1 className="text-2xl font-bold">AnimeMax</h1>
          </div>
          
          <h2 className="text-3xl font-bold mb-6">
            {activeTab === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </h2>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Giriş Yap</TabsTrigger>
              <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kullanıcı Adı</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="kullaniciadi" 
                            {...field} 
                            className="bg-[#2a2a2a] border-[#3a3a3a] focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-[#2a2a2a] border-[#3a3a3a] focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Giriş Yap
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  Hesabın yok mu?{' '}
                  <button 
                    onClick={() => setActiveTab('register')} 
                    className="text-primary hover:underline"
                  >
                    Kayıt ol
                  </button>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kullanıcı Adı</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="kullaniciadi" 
                            {...field} 
                            className="bg-[#2a2a2a] border-[#3a3a3a] focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="ornek@mail.com" 
                            {...field} 
                            className="bg-[#2a2a2a] border-[#3a3a3a] focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-[#2a2a2a] border-[#3a3a3a] focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre Tekrar</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-[#2a2a2a] border-[#3a3a3a] focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Hesap Oluştur
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  Zaten hesabın var mı?{' '}
                  <button 
                    onClick={() => setActiveTab('login')} 
                    className="text-primary hover:underline"
                  >
                    Giriş yap
                  </button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Hero section */}
        <div className="hidden md:flex relative bg-[#1e1e1e] items-center">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1950&q=80" 
              alt="AnimeMax" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e1e1e] to-transparent"></div>
          </div>
          
          <div className="relative z-10 px-10 lg:px-16 max-w-lg">
            <h2 className="text-4xl font-bold mb-6">Anime Dünyasına Hoş Geldin</h2>
            <p className="text-lg text-gray-300 mb-8">
              Türkiye'nin en kapsamlı anime platformunda binlerce anime, HD kalite ve 
              Türkçe altyazı seçenekleriyle seni bekliyor.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-primary mr-3 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div>
                  <h3 className="font-semibold">En Yeni Animeler</h3>
                  <p className="text-sm text-gray-400">Her sezon en yeni animelere anında eriş</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <svg className="w-6 h-6 text-primary mr-3 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div>
                  <h3 className="font-semibold">HD Kalite</h3>
                  <p className="text-sm text-gray-400">Tüm animeleri HD kalitede, reklamsız izle</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <svg className="w-6 h-6 text-primary mr-3 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div>
                  <h3 className="font-semibold">Kişiselleştirme</h3>
                  <p className="text-sm text-gray-400">Senin için özel anime önerileri ve kişisel liste</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
