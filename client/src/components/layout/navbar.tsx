import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Menu, ChevronDown, LogOut, User, History, Heart, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Handle scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/ara?q=${encodeURIComponent(searchQuery)}`);
      setShowMobileSearch(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <header className={`py-4 px-6 md:px-8 sticky top-0 z-50 transition-colors duration-200 ${isScrolled ? 'bg-[#121212]/95 backdrop-blur-sm shadow-md' : 'bg-[#121212]'}`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M11,8V16L16,12L11,8Z" />
              </svg>
              <Link href="/">
                <h1 className="text-2xl font-bold font-sans text-white cursor-pointer">AnimeMax</h1>
              </Link>
            </div>
            
            {/* Nav Links - Desktop */}
            <nav className="hidden md:flex items-center space-x-6">
              <NavLink href="/" label="Ana Sayfa" />
              <NavLink href="/kategori/all" label="Keşfet" />
              <NavLink href="/kategori/seasonal" label="Güncel" />
              <NavLink href="/kategori/popular" label="Popüler" />
              {user && <NavLink href="/profil?tab=favorites" label="Listelerim" />}
            </nav>
            
            {/* Search - Desktop */}
            <div className="hidden md:flex items-center relative rounded-full bg-[#2a2a2a] overflow-hidden w-64">
              <form onSubmit={handleSearch} className="w-full">
                <Input
                  type="text"
                  placeholder="Anime ara..."
                  className="bg-transparent w-full py-2 px-4 pr-10 focus:outline-none text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  type="submit"
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
            
            {/* User Menu & Mobile Controls */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden text-gray-300 hover:text-white"
              >
                <Search className="h-5 w-5" />
              </Button>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-1 p-1 hover:bg-transparent">
                      <Avatar className="w-8 h-8 border-2 border-primary">
                        <AvatarImage src={user.profilePicture || "https://github.com/shadcn.png"} alt={user.username} />
                        <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium">{user.username}</span>
                      <ChevronDown className="hidden md:inline h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-[#2a2a2a] border-[#3a3a3a] text-white">
                    <Link href="/profil">
                      <DropdownMenuItem className="cursor-pointer hover:bg-[#3a3a3a] hover:text-primary focus:bg-[#3a3a3a] focus:text-primary">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profilim</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/profil?tab=history">
                      <DropdownMenuItem className="cursor-pointer hover:bg-[#3a3a3a] hover:text-primary focus:bg-[#3a3a3a] focus:text-primary">
                        <History className="mr-2 h-4 w-4" />
                        <span>İzleme Geçmişim</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/profil?tab=favorites">
                      <DropdownMenuItem className="cursor-pointer hover:bg-[#3a3a3a] hover:text-primary focus:bg-[#3a3a3a] focus:text-primary">
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Favorilerim</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/profil?tab=settings">
                      <DropdownMenuItem className="cursor-pointer hover:bg-[#3a3a3a] hover:text-primary focus:bg-[#3a3a3a] focus:text-primary">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Ayarlar</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer hover:bg-[#3a3a3a] hover:text-primary focus:bg-[#3a3a3a] focus:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                          <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0 3.32 3.32 2.5 2.5 0 1 0 3.62-5.85Z"></path>
                          <path d="m8 8-5 5a1 1 0 0 0 0 1.41l5.61 5.61c.39.38 1.03.38 1.41 0L15 15"></path>
                          <path d="m15 8 5 5a1 1 0 0 1 0 1.41l-5.61 5.61c-.39.38-1.03.38-1.41 0L8 15"></path>
                        </svg>
                        <span>Admin Paneli</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator className="bg-[#3a3a3a]" />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-[#3a3a3a] focus:bg-[#3a3a3a] focus:text-red-300"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <Link href="/auth">
                    <Button className="bg-transparent hover:bg-primary/10 text-primary">
                      Giriş Yap
                    </Button>
                  </Link>
                  <Link href="/auth?register=true">
                    <Button className="bg-primary hover:bg-primary/90">
                      Kayıt Ol
                    </Button>
                  </Link>
                </div>
              )}
              
              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden text-gray-300 hover:text-white"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-[#1e1e1e] text-white border-[#3a3a3a]">
                  <div className="flex flex-col h-full">
                    <div className="py-6 space-y-4">
                      <MobileNavLink href="/" label="Ana Sayfa" />
                      <MobileNavLink href="/kategori/all" label="Keşfet" />
                      <MobileNavLink href="/kategori/seasonal" label="Güncel" />
                      <MobileNavLink href="/kategori/popular" label="Popüler" />
                      {user && <MobileNavLink href="/profil?tab=favorites" label="Listelerim" />}
                    </div>
                    
                    <div className="mt-auto py-6 border-t border-[#3a3a3a]">
                      {user ? (
                        <>
                          <MobileNavLink href="/profil" label="Profilim" />
                          <MobileNavLink href="/profil?tab=settings" label="Ayarlar" />
                          <MobileNavLink href="/admin" label="Admin Paneli" />
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-3 text-left text-red-400 hover:bg-[#2a2a2a] rounded-md transition-colors"
                          >
                            <LogOut className="mr-2 h-5 w-5" />
                            <span>Çıkış Yap</span>
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <Link href="/auth">
                            <button className="w-full bg-transparent border border-primary text-primary hover:bg-primary/10 py-3 rounded-md transition-colors">
                              Giriş Yap
                            </button>
                          </Link>
                          <Link href="/auth?register=true">
                            <button className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-md transition-colors">
                              Kayıt Ol
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search (conditional) */}
      {showMobileSearch && (
        <div className="md:hidden bg-[#2a2a2a] p-4">
          <form onSubmit={handleSearch} className="relative rounded-full bg-[#1e1e1e] overflow-hidden">
            <Input
              type="text"
              placeholder="Anime ara..."
              className="bg-transparent w-full py-2 px-4 pr-10 focus:outline-none text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Button 
              type="submit"
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const isActive = location === href || 
    (href !== "/" && location.startsWith(href));

  return (
    <Link href={href} className={`nav-link ${isActive ? 'active font-medium text-white' : 'font-medium text-gray-300 hover:text-white'} relative`}>
      {label}
      <span className={`absolute bottom-[-4px] left-0 w-0 h-[2px] bg-primary transition-all duration-300 ${isActive ? 'w-full' : ''}`}></span>
    </Link>
  );
}

function MobileNavLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const isActive = location === href || 
    (href !== "/" && location.startsWith(href));

  return (
    <Link 
      href={href}
      className={`block px-4 py-3 rounded-md transition-colors ${isActive ? 'bg-[#2a2a2a] text-primary' : 'text-white hover:bg-[#2a2a2a]'}`}
    >
      {label}
    </Link>
  );
}
