import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  Settings, 
  PictureInPicture, 
  Fullscreen,
  VolumeX,
  Volume1,
  ChevronLeft,
  ChevronRight,
  Subtitles,
  Forward,
  Rewind,
  Sun,
  Moon,
  Palette,
  Type,
  Text,
  RotateCw,
  Maximize,
  Camera,
  Clock,
  Users,
  Share2,
  MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useProgressSync } from '@/hooks/use-progress-sync';
import { useWatchParty } from '@/hooks/use-watch-party';
import { useToast } from '@/hooks/use-toast';
import { formatTime, cn } from '@/lib/utils';

// Video oynatıcı bileşeni için gelişmiş props
interface VideoPlayerProps {
  videoUrl: string;
  animeId: number;
  episodeId: number;
  duration: number;
  title: string;
  episodeTitle?: string;
  subtitles?: Array<{
    lang: string;
    label: string;
    url: string;
  }>;
  onNext?: () => void;
  nextEpisodeAvailable?: boolean;
  thumbnailUrl?: string; // Video önizleme resmi URL'si
  watchPartyMode?: boolean; // Birlikte izleme modu aktif mi
  watchPartyCode?: string; // Mevcut izleme partisi kodu
}

// Video oynatıcı tema türleri
type VideoPlayerTheme = 'classic' | 'dark' | 'light' | 'anime' | 'minimal';

// Altyazı biçimlendirme ayarları tipi
interface SubtitleStyle {
  fontSize: string;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  textShadow: boolean;
  position: 'bottom' | 'top' | 'middle';
}

// Video oynatıcı görünüm ayarları
interface VideoPlayerSettings {
  theme: VideoPlayerTheme;
  subtitleStyle: SubtitleStyle;
  showSkipIntro: boolean;
  showSkipOutro: boolean;
  autoPlay: boolean;
  saveLastPosition: boolean;
}

export function VideoPlayer({
  videoUrl,
  animeId,
  episodeId,
  duration,
  title,
  episodeTitle,
  subtitles = [],
  onNext,
  nextEpisodeAvailable = false,
  thumbnailUrl,
  watchPartyMode = false,
  watchPartyCode
}: VideoPlayerProps) {
  // Oynatıcı temel durumları
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentSubtitle, setCurrentSubtitle] = useState(subtitles[0]?.lang || 'off');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<string>('');
  
  // Gelişmiş özellikler için durumlar
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [captureScreenshot, setCaptureScreenshot] = useState(false);
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false);
  const [showSkipIntroButton, setShowSkipIntroButton] = useState(false);
  const [playerTheme, setPlayerTheme] = useState<VideoPlayerTheme>('dark');
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Altyazı biçimlendirme ayarları
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    textShadow: true,
    position: 'bottom'
  });
  
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const { getProgress, isLoading: syncLoading, sync } = useProgressSync();
  const { toast } = useToast();
  
  // Watch Party entegrasyonu
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const { 
    activeParty,
    participants,
    chatMessages,
    isConnected,
    syncVideoState,
    sendChatMessage,
    createParty,
    joinParty,
    leaveParty
  } = useWatchParty({
    onSyncUpdate: (update) => {
      // Party'deki diğer kullanıcılardan gelen video durumu güncellemelerini işle
      if (!seeking) {
        const newPlayedValue = update.currentTime / duration;
        setPlayed(newPlayedValue);
        playerRef.current?.seekTo(update.currentTime / duration, 'fraction');
        setPlaying(update.isPlaying);
      }
    },
    onChatMessage: (message) => {
      // Eğer chat paneli açık değilse ve yeni mesaj gelirse hafif bir bildirim göster
      if (!showChatPanel) {
        toast({
          title: `${message.username}`,
          description: message.content,
          duration: 3000,
        });
      }
    }
  });
  
  // Get watch history to resume from last position using progress sync
  const { data: watchHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/watch-history', animeId, episodeId, user?.id || '1'],
    queryFn: async () => {
      const userId = user?.id || '1';
      const response = await fetch(`/api/watch-history?animeId=${animeId}&episodeId=${episodeId}&userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Update watch history
  const updateWatchHistoryMutation = useMutation({
    mutationFn: async (data: { progress: number }) => {
      const userId = user?.id;
      await fetch("/api/watch-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          animeId,
          episodeId,
          progress: Math.floor(data.progress),
          duration,
          userId
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watch-history', animeId, episodeId, user?.id || '1'] });
      // After updating watch history, sync progress across devices
      sync();
    },
  });

  // Try to get progress from sync first, fall back to regular watch history
  useEffect(() => {
    // First try to get progress from sync
    const syncedProgress = getProgress(animeId, episodeId);
    
    if (syncedProgress && !syncLoading) {
      // If synced progress exists and it's not too close to the end
      if (syncedProgress.progress < duration - 10) {
        const initialPlayed = syncedProgress.progress / duration;
        setPlayed(initialPlayed);
        playerRef.current?.seekTo(initialPlayed);
      }
    } 
    // Fall back to regular watch history if no synced progress
    else if (watchHistory && !historyLoading) {
      // If the progress is less than 10 seconds from the end, start from beginning
      if (watchHistory.progress < duration - 10) {
        const initialPlayed = watchHistory.progress / duration;
        setPlayed(initialPlayed);
        playerRef.current?.seekTo(initialPlayed);
      }
    }
  }, [watchHistory, historyLoading, syncLoading, duration, animeId, episodeId, getProgress]);

  // Control auto-hiding of controls
  useEffect(() => {
    if (playing) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [playing, showControls]);

  // Handle mouse movement to show controls
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Update watch history periodically (every 5 seconds of playing)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (playing) {
      interval = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        updateWatchHistoryMutation.mutate({ progress: currentTime });
      }, 5000);
    }
    
    return () => {
      clearInterval(interval);
    };
  }, [playing, updateWatchHistoryMutation]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // Handle PiP
  const togglePictureInPicture = async () => {
    try {
      // Find the video element
      const videoElement = containerRef.current?.querySelector('video');
      if (!videoElement) return;
      
      if (document.pictureInPictureElement === videoElement) {
        await document.exitPictureInPicture();
      } else {
        await videoElement.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  // Handle seeking hover
  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    
    setHoverPosition(position);
    setHoverTime(formatTime(position * duration));
  };

  // Handle progress bar leave
  const handleProgressLeave = () => {
    setHoverPosition(null);
  };

  // Player event handlers
  const handlePlayPause = () => {
    const newPlayingState = !playing;
    setPlaying(newPlayingState);
    
    // Watch party modunda oynatma durumunu senkronize et
    if (watchPartyMode && activeParty) {
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      syncVideoState(currentTime, newPlayingState);
    }
  };

  const handleProgress = (state: { played: number; loaded: number; playedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleSeekChange = (value: number[]) => {
    setSeeking(true);
    setPlayed(value[0]);
  };

  const handleSeekMouseUp = () => {
    setSeeking(false);
    const newPosition = played;
    playerRef.current?.seekTo(newPosition);
    
    // Watch party modunda ilerlemeyi senkronize et
    if (watchPartyMode && activeParty) {
      syncVideoState(newPosition * duration, playing);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setMuted(value[0] === 0);
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const handleEnded = () => {
    setPlaying(false);
    if (nextEpisodeAvailable && onNext) {
      setTimeout(() => {
        onNext();
      }, 5000);
    }
  };

  const handleSkipForward = () => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    const newTime = Math.min(currentTime + 10, duration);
    playerRef.current?.seekTo(newTime / duration);
    
    // Watch party modunda ilerlemeyi senkronize et
    if (watchPartyMode && activeParty) {
      syncVideoState(newTime, playing);
    }
  };

  const handleSkipBackward = () => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    const newTime = Math.max(currentTime - 10, 0);
    playerRef.current?.seekTo(newTime / duration);
    
    // Watch party modunda ilerlemeyi senkronize et
    if (watchPartyMode && activeParty) {
      syncVideoState(newTime, playing);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          const newPlayingState = !playing;
          setPlaying(newPlayingState);
          
          // Watch party modunda oynatma durumunu senkronize et
          if (watchPartyMode && activeParty) {
            const currentTime = playerRef.current?.getCurrentTime() || 0;
            syncVideoState(currentTime, newPlayingState);
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowright':
          e.preventDefault();
          handleSkipForward();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSkipBackward();
          break;
        case 'j':
          e.preventDefault();
          handleSkipBackward();
          break;
        case 'l':
          e.preventDefault();
          handleSkipForward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Tema spesifik stilleri uygulama
  const getThemeClasses = () => {
    switch (playerTheme) {
      case 'light':
        return 'bg-white text-black';
      case 'anime':
        return 'bg-gradient-to-r from-purple-800 to-blue-900 text-white';
      case 'minimal':
        return 'bg-black text-white';
      case 'classic':
        return 'bg-gray-900 text-white';
      case 'dark':
      default:
        return 'bg-black text-white';
    }
  };
  
  // Altyazı stili uygulaması için CSS değişkenleri
  const getSubtitleStyles = () => {
    let textShadowVal = subtitleStyle.textShadow ? '1px 1px 2px black, 0 0 1em black, 0 0 0.2em black' : 'none';
    
    // Altyazı pozisyonu
    let positionStyle = {};
    switch (subtitleStyle.position) {
      case 'top':
        positionStyle = { top: '10%', bottom: 'auto' };
        break;
      case 'middle':
        positionStyle = { top: '50%', transform: 'translateY(-50%)' };
        break;
      case 'bottom':
      default:
        positionStyle = { bottom: '10%', top: 'auto' };
        break;
    }
    
    return {
      '--subtitle-font-size': subtitleStyle.fontSize,
      '--subtitle-font-family': subtitleStyle.fontFamily,
      '--subtitle-color': subtitleStyle.color,
      '--subtitle-bg-color': subtitleStyle.backgroundColor,
      '--subtitle-text-shadow': textShadowVal,
      ...positionStyle
    } as React.CSSProperties;
  };
  
  // Ekran görüntüsü alma fonksiyonu
  const takeScreenshot = () => {
    const video = containerRef.current?.querySelector('video');
    if (!video) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Ekran görüntüsünü bir link olarak indirme
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${title} - Bölüm ${episodeId} - ${formatTime(played * duration)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Ekran görüntüsü alındıktan sonra durumu sıfırla
      setCaptureScreenshot(false);
    } catch (error) {
      console.error('Ekran görüntüsü alınamadı:', error);
      setCaptureScreenshot(false);
    }
  };
  
  // Ekran görüntüsü alma işlemini tetikle
  useEffect(() => {
    if (captureScreenshot) {
      takeScreenshot();
    }
  }, [captureScreenshot]);
  
  // Watch Party'de periyodik olarak video durumunu senkronize et
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;
    
    if (watchPartyMode && activeParty && playing && !seeking) {
      syncInterval = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        syncVideoState(currentTime, playing);
      }, 5000); // 5 saniyede bir durumu güncelle
    }
    
    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [watchPartyMode, activeParty, playing, seeking, syncVideoState]);

  // Sonraki bölüm overlay'ı için süre takibi
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (played > 0.97 && nextEpisodeAvailable && !showNextEpisodeOverlay) {
      setShowNextEpisodeOverlay(true);
    } else if (played < 0.9 && showNextEpisodeOverlay) {
      setShowNextEpisodeOverlay(false);
    }
    
    return () => clearTimeout(timeout);
  }, [played, nextEpisodeAvailable, showNextEpisodeOverlay]);
  
  // "İntroyu Geç" butonunu göstermek için süre takibi yapın
  useEffect(() => {
    let introTimeout: NodeJS.Timeout;
    
    // Videonun başında belirli bir zaman aralığında "İntroyu Geç" butonu gösterilir
    // Gerçek uygulamada, bu anime'nin intro zamanları API'den gelmelidir
    if (played > 0.02 && played < 0.2 && !showSkipIntroButton) {
      setShowSkipIntroButton(true);
      
      // İntro zamanı geçtikten sonra butonu gizle
      introTimeout = setTimeout(() => {
        setShowSkipIntroButton(false);
      }, 15000); // 15 saniye sonra intro butonu kaybolur
    }
    
    return () => clearTimeout(introTimeout);
  }, [played, showSkipIntroButton]);
  
  // CSS class değişkenlerini oluştur
  const containerClasses = cn(
    "video-container relative aspect-video rounded-lg overflow-hidden",
    getThemeClasses()
  );

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      style={{
        ...getSubtitleStyles(),
        maxHeight: '80vh', // Ekranda maksimum yükseklik sınırı
        margin: '0 auto' // Ortalama
      }}
    >
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        width="100%"
        height="100%"
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        onProgress={handleProgress}
        onEnded={handleEnded}
        onBuffer={() => setIsBuffering(true)}
        onBufferEnd={() => setIsBuffering(false)}
        config={{
          file: {
            attributes: {
              crossOrigin: "anonymous",
              playsInline: true, // iOS için oynatmayı iyileştirir
              controlsList: "nodownload", // İndirme seçeneğini gizle
              onContextMenu: (e: any) => e.preventDefault() // Sağ tıklama menüsünü engelle
            },
            tracks: subtitles.map(subtitle => ({
              kind: 'subtitles',
              src: subtitle.url,
              srcLang: subtitle.lang,
              label: subtitle.label,
              default: subtitle.lang === currentSubtitle
            }))
          }
        }}
      />

      {/* Video buffering animation */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-gray-400 border-t-primary rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play overlay - visible when video is paused */}
      <AnimatePresence>
        {!playing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 cursor-pointer z-10"
            onClick={handlePlayPause}
          >
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary hover:bg-primary-dark text-white p-6 rounded-full flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
            >
              <Play className="h-10 w-10" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip intro button - appears at the intro of the video */}
      <AnimatePresence>
        {showSkipIntroButton && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-24 right-4 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md flex items-center space-x-2 z-30"
            onClick={() => {
              // Skip to after intro (approximately 1.5 minutes)
              const newPosition = 1.5 / duration;
              playerRef.current?.seekTo(newPosition);
              setShowSkipIntroButton(false);
              
              // Watch party modunda ilerlemeyi senkronize et
              if (watchPartyMode && activeParty) {
                syncVideoState(1.5, playing);
              }
            }}
          >
            <span>İntroyu Geç</span>
            <SkipForward className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next episode overlay - appears near the end of the video */}
      <AnimatePresence>
        {showNextEpisodeOverlay && nextEpisodeAvailable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-30"
          >
            <div className="bg-dark p-6 rounded-lg max-w-md text-center">
              <h3 className="text-xl font-bold mb-3">Sonraki Bölüm</h3>
              <p className="mb-4 text-gray-300">Sonraki bölüme geçiş için: 5 saniye</p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={onNext}
                  className="bg-primary hover:bg-primary-dark"
                >
                  Şimdi İzle
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNextEpisodeOverlay(false)}
                >
                  İptal
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot button */}
      <AnimatePresence>
        {showControls && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 p-2 rounded-full text-white z-20"
            onClick={() => setCaptureScreenshot(true)}
          >
            <Camera className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 flex flex-col justify-end z-20 
          ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Video title and episode */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h3 className="text-white font-medium truncate">{title}</h3>
          {episodeTitle && (
            <p className="text-gray-200 text-sm truncate">{episodeTitle}</p>
          )}
        </div>

        {/* Progress bar hover preview */}
        {hoverPosition !== null && (
          <div 
            className="absolute bottom-20 bg-black bg-opacity-80 py-1 px-2 rounded text-xs text-white"
            style={{ left: `calc(${hoverPosition * 100}% - 20px)` }}
          >
            {hoverTime}
          </div>
        )}

        {/* Controls Container */}
        <div className="bg-gradient-to-t from-black/80 to-transparent pt-10 pb-2">
          {/* Progress bar */}
          <div className="px-4 py-2"
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
          >
            <Slider
              value={[played]}
              min={0}
              max={1}
              step={0.001}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekMouseUp}
              className="cursor-pointer"
            />
          </div>

          {/* Control buttons */}
          <div className="px-4 flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={handlePlayPause} className="text-white hover:text-primary transition-colors">
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <Button variant="ghost" size="icon" onClick={handleSkipBackward} className="text-white hover:text-primary transition-colors">
                <Rewind className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={handleSkipForward} className="text-white hover:text-primary transition-colors">
                <Forward className="h-5 w-5" />
              </Button>
              
              <div className="relative" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                  {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : 
                   volume < 0.5 ? <Volume1 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                
                {showVolumeSlider && (
                  <div className="absolute left-0 -top-20 bg-black/80 backdrop-blur-sm p-3 rounded-md shadow-lg">
                    <Slider
                      className="h-20 w-6"
                      defaultValue={[muted ? 0 : volume]}
                      value={[muted ? 0 : volume]}
                      min={0}
                      max={1}
                      step={0.01}
                      orientation="vertical"
                      onValueChange={handleVolumeChange}
                    />
                  </div>
                )}
              </div>
              
              <div className="text-white text-sm ml-2">
                <span>{formatTime(played * duration)}</span>
                <span className="mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Right controls */}
            <div className="flex items-center space-x-1">
              {/* Subtitle selector */}
              {subtitles.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:text-primary transition-colors"
                    >
                      <Subtitles className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-dark-card text-white">
                    <DropdownMenuLabel>Altyazı Seçimi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={currentSubtitle} onValueChange={setCurrentSubtitle}>
                      <DropdownMenuRadioItem value="off">Kapalı</DropdownMenuRadioItem>
                      {subtitles.map((subtitle) => (
                        <DropdownMenuRadioItem key={subtitle.lang} value={subtitle.lang}>
                          {subtitle.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            
              {/* Animasyonlu Ayarlar Menüsü */}
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white hover:text-primary transition-colors"
                        onClick={() => setShowSettings(!showSettings)}
                      >
                        <motion.div
                          animate={{ rotate: showSettings ? 90 : 0 }}
                          transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                        >
                          <Settings className="h-5 w-5" />
                        </motion.div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Ayarlar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <AnimatePresence>
                  {showSettings && (
                    <>
                      {/* Click outside to close */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSettings(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
                        className="absolute right-0 bottom-14 w-64 bg-black bg-opacity-90 backdrop-blur-sm rounded-md overflow-hidden z-50 shadow-xl"
                        style={{ transformOrigin: "bottom right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-3 border-b border-gray-700">
                          <h3 className="text-sm font-medium text-white">Oynatıcı Ayarları</h3>
                        </div>
                        
                        {/* Tema Seçimi */}
                        <div className="p-3 border-b border-gray-700">
                          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center">
                            <Palette className="h-3.5 w-3.5 mr-1.5" />
                            Oynatıcı Teması
                          </h4>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { value: 'dark', label: 'Karanlık', color: 'bg-gray-900' },
                              { value: 'light', label: 'Aydınlık', color: 'bg-gray-100' },
                              { value: 'anime', label: 'Anime', color: 'bg-purple-800' },
                              { value: 'minimal', label: 'Minimal', color: 'bg-black' },
                              { value: 'classic', label: 'Klasik', color: 'bg-blue-900' }
                            ].map(theme => (
                              <motion.button
                                key={theme.value}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setPlayerTheme(theme.value as VideoPlayerTheme)}
                                className={`flex flex-col items-center p-1 rounded ${playerTheme === theme.value ? 'ring-2 ring-primary' : ''}`}
                              >
                                <div className={`${theme.color} w-8 h-8 rounded-sm mb-1`}></div>
                                <span className="text-[10px] text-white">{theme.label}</span>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Oynatma Hızı */}
                        <div className="p-3">
                          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            Oynatma Hızı
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                              <motion.button
                                key={rate}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setPlaybackRate(rate)}
                                className={`px-2 py-1 rounded text-xs ${playbackRate === rate ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300'}`}
                              >
                                {rate === 1 ? 'Normal' : `${rate}x`}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Diğer Ayarlar */}
                        <div className="p-3 border-t border-gray-700">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={togglePictureInPicture}
                            className="flex items-center justify-between w-full p-2 rounded hover:bg-gray-800 mb-2"
                          >
                            <span className="flex items-center text-xs text-white">
                              <PictureInPicture className="h-3.5 w-3.5 mr-1.5" />
                              Resim İçinde Resim
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={toggleFullscreen}
                            className="flex items-center justify-between w-full p-2 rounded hover:bg-gray-800"
                          >
                            <span className="flex items-center text-xs text-white">
                              <Fullscreen className="h-3.5 w-3.5 mr-1.5" />
                              Tam Ekran
                            </span>
                            <span className="text-[10px] text-gray-400">F</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={togglePictureInPicture}
                      className="text-white hover:text-primary transition-colors"
                    >
                      <PictureInPicture className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Resim İçinde Resim</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-primary transition-colors"
                    >
                      <Fullscreen className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Tam Ekran (F tuşu)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Watch Party butonu - Artık tüm kullanıcılar için erişilebilir */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "text-white hover:text-primary transition-colors relative",
                        activeParty ? "text-primary" : ""
                      )}
                      onClick={() => setShowChatPanel(!showChatPanel)}
                    >
                      <Users className="h-5 w-5" />
                      {activeParty && participants.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                          {participants.length}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Birlikte İzle</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
      
      {/* Watch Party Sohbet Paneli - Görünürlüğünü toggle butonu ile kontrol et */}
      <AnimatePresence>
        {showChatPanel && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-black/90 backdrop-blur-sm z-40 flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div>
                <h3 className="text-white font-medium">Birlikte İzle</h3>
                <p className="text-gray-400 text-xs">
                  {activeParty ? 
                    `Oda Kodu: ${activeParty.roomCode} | ${participants.length} Katılımcı` : 
                    'Yeni bir parti başlat veya bir odaya katıl'
                  }
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowChatPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <ChevronRight />
              </Button>
            </div>
            
            {!activeParty ? (
              <div className="p-4 flex flex-col gap-3">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    createParty({
                      animeId,
                      episodeId,
                      isPublic: true
                    });
                    toast({
                      title: "Watch Party başlatıldı!",
                      description: "Arkadaşlarını davet edebilirsin.",
                    });
                  }}
                >
                  Yeni Parti Başlat
                </Button>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Oda Kodu Gir"
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
                  />
                  <Button 
                    className="absolute right-0 top-0 h-full"
                    onClick={() => {
                      // Oda kodunu inputtan al
                      const input = document.querySelector('input[placeholder="Oda Kodu Gir"]') as HTMLInputElement;
                      const code = input?.value;
                      
                      if (!code) {
                        toast({
                          title: "Hata",
                          description: "Lütfen bir oda kodu girin.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      joinParty(code);
                    }}
                  >
                    Katıl
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Katılımcılar */}
                <div className="p-2 border-b border-gray-700">
                  <h4 className="text-gray-400 text-xs mb-2 px-2">Katılımcılar</h4>
                  <div className="flex flex-wrap gap-2 px-2">
                    {participants.map(participant => (
                      <div key={participant.userId} className="flex items-center space-x-1 bg-gray-800 rounded-full px-2 py-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-white text-xs">{participant.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Sohbet alanı */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                  {chatMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-500 text-sm">Sohbet mesajları burada görünecek</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded max-w-[80%] ${
                          message.userId === user?.id ? 
                            'bg-primary/80 text-white ml-auto' : 
                            'bg-gray-800 text-white'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1">{message.username}</p>
                        <p className="text-sm">{message.content}</p>
                        <span className="text-[10px] opacity-70 block text-right">{
                          new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        }</span>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Mesaj gönderme alanı */}
                <div className="p-3 border-t border-gray-700">
                  <div className="flex">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 p-2 rounded-l bg-gray-800 text-white border border-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && chatMessage.trim()) {
                          sendChatMessage(chatMessage);
                          setChatMessage('');
                        }
                      }}
                    />
                    <Button 
                      className="rounded-l-none"
                      onClick={() => {
                        if (chatMessage.trim()) {
                          sendChatMessage(chatMessage);
                          setChatMessage('');
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        // Partideki video durumunu paylaş
                        const currentTime = playerRef.current?.getCurrentTime() || 0;
                        syncVideoState(currentTime, playing);
                        
                        toast({
                          title: "Video durumu senkronize edildi",
                          description: "Tüm katılımcılar aynı noktada izliyor."
                        });
                      }}
                    >
                      Videoyu Senkronize Et
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        leaveParty();
                        setShowChatPanel(false);
                        
                        toast({
                          title: "Watch Party'den ayrıldın",
                        });
                      }}
                    >
                      Ayrıl
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}