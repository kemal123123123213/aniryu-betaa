import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-[#1e1e1e] py-8 px-6 md:px-8 mt-12">
      <div className="container mx-auto">
        {/* Footer top section */}
        <div className="flex flex-col md:flex-row justify-between mb-8 gap-8">
          {/* Logo and description */}
          <div className="md:w-1/3">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M11,8V16L16,12L11,8Z" />
              </svg>
              <h2 className="text-2xl font-bold font-sans text-white">AnimeMax</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Türkiye'nin en kapsamlı anime izleme platformu. Binlerce anime, yüksek kaliteli Türkçe altyazı ve dublaj seçenekleri.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.634,4.031c-0.815,0.385-2.202,1.107-2.899,1.245c-0.027,0.007-0.049,0.016-0.075,0.023 c-0.813-0.802-1.927-1.299-3.16-1.299c-2.485,0-4.5,2.015-4.5,4.5c0,0.131-0.011,0.372,0,0.5c-3.218,0-5.568-1.679-7.327-3.837 C3.438,4.873,3.188,5.024,3.136,5.23C3.019,5.696,2.979,6.475,2.979,7.031c0,1.401,1.095,2.777,2.8,3.63 c-0.314,0.081-0.66,0.139-1.02,0.139c-0.424,0-0.912-0.111-1.339-0.335c-0.158-0.083-0.499-0.06-0.398,0.344 c0.405,1.619,2.253,2.756,3.904,3.087c-0.375,0.221-1.175,0.176-1.543,0.176c-0.136,0-0.609-0.032-0.915-0.07 c-0.279-0.034-0.708,0.038-0.349,0.582c0.771,1.167,2.515,1.9,4.016,1.928c-1.382,1.084-3.642,1.48-5.616,1.48 c-0.198,0-0.396-0.013-0.59-0.033c-0.302-0.031-0.594,0.157-0.588,0.489c0.01,0.497,0.25,0.465,0.547,0.629 c1.79,0.997,4.242,1.559,6.454,1.559c7.928,0,12.257-6.218,12.257-11.797c0-0.141-0.003-0.283-0.009-0.424 c0-0.017,0.009-0.032,0.009-0.05c0-0.019-0.01-0.035-0.01-0.053c0-0.027,0.01-0.053,0.01-0.08c0.831-0.623,1.548-1.365,2.122-2.215 c0.175-0.258,0.348-0.531-0.057-0.752c-0.403-0.219-1.478,0.293-1.869,0.461c0.671-0.596,1.094-1.172,1.341-1.571 c0.146-0.236,0.191-0.415-0.351-0.658c-0.543-0.243-1.562,0.375-2.021,0.64c-0.064,0.036-0.117,0.066-0.151,0.083 C22.802,3.707,22.5,3.805,21.634,4.031z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.443 5.345c.863 0 1.562.7 1.562 1.562 0 .86-.7 1.563-1.562 1.563A1.566 1.566 0 0 1 5.88 6.906c0-.86.7-1.56 1.563-1.56Zm.1 2.68h3.1V20.1h-3.1V8.026Zm11.127-.118c-1.682 0-2.707 1.01-3.1 1.67h-.042l-.152-1.466h-2.707c.05 1.048.1 2.282.1 3.572V20.1h3.1v-6.36c0-.26.17-.49.043-.677.253-.62.81-1.27 1.8-1.27 1.29 0 1.83.978 1.83 2.408v5.883h3.1v-6.36c0-2.88-1.587-4.233-3.747-4.233Z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557a9.83 9.83 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724 9.864 9.864 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.382 4.482A13.978 13.978 0 0 1 1.671 3.15a4.93 4.93 0 0 0 1.523 6.574 4.903 4.903 0 0 1-2.229-.616v.061a4.917 4.917 0 0 0 3.95 4.828 4.982 4.982 0 0 1-2.224.085 4.919 4.919 0 0 0 4.6 3.42 9.873 9.873 0 0 1-6.114 2.107c-.4 0-.791-.023-1.177-.068a13.932 13.932 0 0 0 7.548 2.213c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636A10.024 10.024 0 0 0 24 4.557Z" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Links columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4">Keşfet</h3>
              <ul className="space-y-2">
                <li><Link href="/kategori/all" className="text-gray-400 hover:text-primary transition-colors text-sm">Animeler</Link></li>
                <li><Link href="/kategori/all" className="text-gray-400 hover:text-primary transition-colors text-sm">Kategoriler</Link></li>
                <li><Link href="/kategori/popular" className="text-gray-400 hover:text-primary transition-colors text-sm">Popüler</Link></li>
                <li><Link href="/kategori/seasonal" className="text-gray-400 hover:text-primary transition-colors text-sm">Yeni Çıkanlar</Link></li>
                <li><Link href="/" className="text-gray-400 hover:text-primary transition-colors text-sm">Önerilenler</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Hesap</h3>
              <ul className="space-y-2">
                <li><Link href="/profil" className="text-gray-400 hover:text-primary transition-colors text-sm">Profil</Link></li>
                <li><Link href="/profil?tab=favorites" className="text-gray-400 hover:text-primary transition-colors text-sm">Favorilerim</Link></li>
                <li><Link href="/profil?tab=history" className="text-gray-400 hover:text-primary transition-colors text-sm">İzleme Listem</Link></li>
                <li><Link href="/profil?tab=settings" className="text-gray-400 hover:text-primary transition-colors text-sm">Ayarlar</Link></li>
                <li><span className="text-gray-400 cursor-pointer hover:text-primary transition-colors text-sm">Çıkış Yap</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Destek</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-primary transition-colors text-sm">Hakkımızda</a></li>
                <li><a href="#" className="text-gray-400 hover:text-primary transition-colors text-sm">SSS</a></li>
                <li><a href="#" className="text-gray-400 hover:text-primary transition-colors text-sm">İletişim</a></li>
                <li><a href="#" className="text-gray-400 hover:text-primary transition-colors text-sm">Gizlilik Politikası</a></li>
                <li><a href="#" className="text-gray-400 hover:text-primary transition-colors text-sm">Kullanım Şartları</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer bottom section */}
        <div className="border-t border-[#2a2a2a] pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} AnimeMax. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 text-sm">Türkçe</span>
            <span className="text-gray-500 text-sm">Çerezler</span>
            <span className="text-gray-500 text-sm">Yasal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
