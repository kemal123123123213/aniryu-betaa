import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Redirect } from "wouter";
import { sql } from "drizzle-orm";
import { Loader2, Trash2, Edit, Check, X, Users, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editedRole, setEditedRole] = useState("");

  // Redirect if not admin
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    toast({
      title: "Yetkisiz erişim",
      description: "Bu sayfaya erişmek için admin yetkileri gereklidir.",
      variant: "destructive",
    });
    return <Redirect to="/" />;
  }

  // User management queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      if (!response.ok) {
        throw new Error("Kullanıcılar yüklenirken bir hata oluştu");
      }
      return response.json();
    },
  });

  // Stats queries
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/stats");
      if (!response.ok) {
        throw new Error("İstatistikler yüklenirken bir hata oluştu");
      }
      return response.json();
    },
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<User> }) => {
      const response = await apiRequest("PUT", `/api/admin/user/${id}`, data);
      if (!response.ok) {
        throw new Error("Kullanıcı güncellenirken bir hata oluştu");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({
        title: "Başarılı",
        description: "Kullanıcı bilgileri güncellendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Rol değiştirme API'ı
  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await apiRequest("POST", `/api/admin/set-role`, { userId, role });
      if (!response.ok) {
        throw new Error("Kullanıcı rolü değiştirilirken bir hata oluştu");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({
        title: "Başarılı",
        description: data.message || "Kullanıcı rolü güncellendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/user/${id}`);
      if (!response.ok) {
        throw new Error("Kullanıcı silinirken bir hata oluştu");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Başarılı",
        description: "Kullanıcı silindi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle edit save - yeni rol değiştirme API'ını kullanalım
  const handleSaveEdit = () => {
    if (!editingUser) return;
    
    // Rol değiştirme API'ını kullan
    setRoleMutation.mutate({
      userId: editingUser.id,
      role: editedRole
    });
  };

  // Handle start editing
  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditedRole(user.role);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Yönetim Paneli</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Kullanıcılar</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span>İstatistikler</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Yönetimi</CardTitle>
              <CardDescription>
                Platforma kayıtlı kullanıcıları yönetin, düzenleyin veya silin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Kullanıcı Adı</TableHead>
                        <TableHead>E-posta</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {editingUser?.id === user.id ? (
                              <div className="flex items-center space-x-2">
                                <select 
                                  value={editedRole} 
                                  onChange={(e) => setEditedRole(e.target.value)}
                                  className="p-1 text-xs border rounded"
                                >
                                  <option value="user">Kullanıcı</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <div className="flex space-x-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={handleSaveEdit} 
                                    className="h-6 w-6"
                                    disabled={setRoleMutation.isPending}
                                  >
                                    {setRoleMutation.isPending ? 
                                      <Loader2 className="h-3 w-3 animate-spin" /> : 
                                      <Check className="h-3 w-3" />
                                    }
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setEditingUser(null)} 
                                    className="h-6 w-6"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span className={user.role === "admin" ? "text-primary font-medium" : ""}>
                                {user.role === "admin" ? "Admin" : "Kullanıcı"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString("tr-TR")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleStartEdit(user)}
                                disabled={editingUser !== null}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    disabled={user.id === user?.id}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <span className="font-medium">{user.username}</span> adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {deleteUserMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                      )}
                                      Sil
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Toplam {users.length} kullanıcı listelenmiştir
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform İstatistikleri</CardTitle>
              <CardDescription>
                Platformun genel kullanım istatistiklerini görüntüleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Toplam Kullanıcı" 
                    value={stats.userCount} 
                    icon={<Users className="h-8 w-8" />} 
                  />
                  <StatCard 
                    title="İzleme Geçmişi" 
                    value={stats.watchHistoryCount} 
                    icon={<Users className="h-8 w-8" />} 
                  />
                  <StatCard 
                    title="Toplam Yorum" 
                    value={stats.commentsCount} 
                    icon={<Users className="h-8 w-8" />} 
                  />
                  <StatCard 
                    title="Toplam Anket" 
                    value={stats.pollsCount} 
                    icon={<Users className="h-8 w-8" />} 
                  />
                </div>
              ) : (
                <p>İstatistikler yüklenirken bir hata oluştu.</p>
              )}
            </CardContent>
            {stats && (
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Son güncelleme: {new Date(stats.lastUpdated).toLocaleString("tr-TR")}
                </p>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-1">{value}</h3>
          </div>
          <div className="text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}