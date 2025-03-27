import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  image: string;
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // These are popular anime genres
    const animeCategories: Category[] = [
      { 
        id: 'action', 
        name: 'Aksiyon', 
        image: 'https://images.unsplash.com/photo-1626197031507-4879730a984d?auto=format&fit=crop&w=500&q=80' 
      },
      { 
        id: 'romance', 
        name: 'Romantik', 
        image: 'https://images.unsplash.com/photo-1604631806668-0fe70d846690?auto=format&fit=crop&w=500&q=80' 
      },
      { 
        id: 'comedy', 
        name: 'Komedi', 
        image: 'https://images.unsplash.com/photo-1605979257913-1704eb7b6246?auto=format&fit=crop&w=500&q=80' 
      },
      { 
        id: 'fantasy', 
        name: 'Fantezi', 
        image: 'https://images.unsplash.com/photo-1602020268677-d382930ad8fa?auto=format&fit=crop&w=500&q=80' 
      },
      { 
        id: 'sci-fi', 
        name: 'Bilim Kurgu', 
        image: 'https://images.unsplash.com/photo-1519736927049-de9d64a70a33?auto=format&fit=crop&w=500&q=80' 
      },
      { 
        id: 'adventure', 
        name: 'Macera', 
        image: 'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?auto=format&fit=crop&w=500&q=80' 
      }
    ];
    
    setCategories(animeCategories);
  }, []);

  return (
    <section className="container mx-auto px-6 md:px-8 mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-sans">Kategoriler</h2>
        <Link href="/kategori/all">
          <a className="text-primary hover:text-primary-light text-sm font-medium flex items-center">
            Tümünü Gör
            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/kategori/${category.id}`}>
      <motion.div 
        className="bg-[#2a2a2a] rounded-lg overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative aspect-square">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <h3 className="text-xl font-bold font-sans text-white text-center">{category.name}</h3>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
