import { Link } from 'wouter';
import { motion } from 'framer-motion';

export interface AnimeCardProps {
  id: number;
  title: string;
  image: string;
  score?: number;
  genres?: string[];
}

export function AnimeCard({ id, title, image, score, genres }: AnimeCardProps) {
  return (
    <motion.div 
      className="anime-card bg-[#2a2a2a] rounded-lg overflow-hidden"
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative aspect-[3/4]">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {score && (
          <div className="absolute top-2 left-2">
            <span className="bg-primary px-2 py-1 rounded text-xs font-bold">
              {score}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end">
          <div className="p-3 w-full">
            <Link href={`/anime/${id}`}>
              <button className="bg-primary hover:bg-primary-dark text-white w-full py-2 rounded-lg font-medium flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                İzle
              </button>
            </Link>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium truncate text-white">{title}</h3>
        {genres && (
          <p className="text-xs text-gray-400 truncate">
            {genres.slice(0, 3).join(', ')}
          </p>
        )}
      </div>
    </motion.div>
  );
}
