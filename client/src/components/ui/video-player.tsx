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
  Camera
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
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
  thumbnailUrl
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
  
  // Get watch history to resume from last position
  const { data: watchHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/watch-history', animeId, episodeId],
    queryFn: async () => {
      const response = await fetch(`/api/watch-history?animeId=${animeId}&episodeId=${episodeId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user,
  });

  // Update watch history
  const updateWatchHistoryMutation = useMutation({
    mutationFn: async (data: { progress: number }) => {
      await apiRequest("POST", "/api/watch-history", {
        animeId,
        episodeId,
        progress: Math.floor(data.progress),
        duration
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watch-history'] });
    },
  });

  // Set initial played value from watch history
  useEffect(() => {
    if (watchHistory && !historyLoading) {
      // If the progress is less than 10 seconds from the end, start from beginning
      if (watchHistory.progress < duration - 10) {
        const initialPlayed = watchHistory.progress / duration;
        setPlayed(initialPlayed);
        playerRef.current?.seekTo(initialPlayed);
      }
    }
  }, [watchHistory, historyLoading, duration]);

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
    
    if (playing && user) {
      interval = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        updateWatchHistoryMutation.mutate({ progress: currentTime });
      }, 5000);
    }
    
    return () => {
      clearInterval(interval);
    };
  }, [playing, user, updateWatchHistoryMutation]);

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
    setPlaying(!playing);
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
    playerRef.current?.seekTo(played);
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
  };

  const handleSkipBackward = () => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    const newTime = Math.max(currentTime - 10, 0);
    playerRef.current?.seekTo(newTime / duration);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          setPlaying(prev => !prev);
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
      style={getSubtitleStyles()}
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
              crossOrigin: "anonymous"
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
      
      {/* Skip Intro Button - Appears when appropriate */}
      <AnimatePresence>
        {showSkipIntroButton && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-32 right-4 bg-primary text-white px-4 py-2 rounded-md z-30"
            onClick={() => {
              // Teorik olarak, intro süresi 90 saniye
              const skipToTime = Math.min(90, duration) / duration;
              playerRef.current?.seekTo(skipToTime);
              setShowSkipIntroButton(false);
            }}
          >
            İntroyu Geç
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Next Episode Overlay */}
      <AnimatePresence>
        {showNextEpisodeOverlay && nextEpisodeAvailable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-40"
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Sonraki Bölüm</h3>
              <p className="mb-6">5 saniye içinde otomatik olarak başlayacak.</p>
              <div className="flex space-x-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowNextEpisodeOverlay(false)}
                >
                  İptal
                </Button>
                <Button
                  variant="default"
                  onClick={onNext}
                >
                  Şimdi İzle
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video controls */}
      <div 
        className={`video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 z-20 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Progress bar */}
        <div 
          className="relative mb-3 group cursor-pointer"
          onMouseMove={handleProgressHover}
          onMouseLeave={handleProgressLeave}
        >
          <div className="progress-bar w-full bg-gray-600 rounded-full">
            <div 
              className="bg-primary h-full rounded-full transition-all relative" 
              style={{ width: `${played * 100}%` }}
            ></div>
          </div>
          
          {/* Hover time indicator */}
          {hoverPosition !== null && (
            <div 
              className="absolute -top-8 px-2 py-1 bg-dark-card rounded text-xs transform -translate-x-1/2 z-30"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              {hoverTime}
            </div>
          )}
          
          {/* Video thumb */}
          <div 
            className="absolute w-4 h-4 bg-primary rounded-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${played * 100}%` }}
            onMouseDown={() => setSeeking(true)}
          ></div>

          {/* Seekable progress bar */}
          <Slider
            value={[played]}
            min={0}
            max={1}
            step={0.001}
            onValueChange={handleSeekChange}
            onValueCommit={() => handleSeekMouseUp()}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        
        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePlayPause}
              className="text-white hover:text-primary transition-colors"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            {nextEpisodeAvailable && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onNext}
                className="text-white hover:text-primary transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            )}
            
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-12 left-0 w-32 h-8 bg-dark-card rounded-lg p-2 flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <Slider
                    value={[muted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="text-sm text-white">
              <span>{formatTime(played * duration)}</span>
              <span className="text-gray-400"> / </span>
              <span className="text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Right controls */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleSkipBackward}
                      className="text-white hover:text-primary transition-colors"
                    >
                      <Rewind className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>10 saniye geri (J tuşu)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleSkipForward}
                      className="text-white hover:text-primary transition-colors"
                    >
                      <Forward className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>10 saniye ileri (L tuşu)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Ekran görüntüsü alma butonu */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setCaptureScreenshot(true)}
                    className="text-white hover:text-primary transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Ekran görüntüsü al</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Altyazı menüsü */}
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
                <DropdownMenuContent align="end" className="w-56 bg-dark-card text-white">
                  <DropdownMenuLabel>Altyazılar</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCurrentSubtitle('off')}
                    className={currentSubtitle === 'off' ? 'bg-primary/20' : ''}
                  >
                    Kapalı
                  </DropdownMenuItem>
                  {subtitles.map((subtitle) => (
                    <DropdownMenuItem
                      key={subtitle.lang}
                      onClick={() => setCurrentSubtitle(subtitle.lang)}
                      className={currentSubtitle === subtitle.lang ? 'bg-primary/20' : ''}
                    >
                      {subtitle.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Text className="mr-2 h-4 w-4" />
                      <span>Altyazı Stili</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-dark-card text-white">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Yazı Boyutu</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="bg-dark-card text-white">
                              {['12px', '14px', '16px', '18px', '20px', '22px'].map(size => (
                                <DropdownMenuItem 
                                  key={size}
                                  onClick={() => setSubtitleStyle({...subtitleStyle, fontSize: size})}
                                  className={subtitleStyle.fontSize === size ? 'bg-primary/20' : ''}
                                >
                                  {size}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Yazı Rengi</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="bg-dark-card text-white">
                              {[
                                { name: 'Beyaz', value: 'white' },
                                { name: 'Sarı', value: 'yellow' },
                                { name: 'Yeşil', value: 'lightgreen' },
                                { name: 'Mavi', value: 'lightblue' },
                                { name: 'Pembe', value: 'pink' }
                              ].map(color => (
                                <DropdownMenuItem 
                                  key={color.value}
                                  onClick={() => setSubtitleStyle({...subtitleStyle, color: color.value})}
                                  className={subtitleStyle.color === color.value ? 'bg-primary/20' : ''}
                                >
                                  <div className="flex items-center">
                                    <div 
                                      className="w-4 h-4 rounded-full mr-2" 
                                      style={{ backgroundColor: color.value }}
                                    ></div>
                                    {color.name}
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Arkaplan</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="bg-dark-card text-white">
                              {[
                                { name: 'Siyah', value: 'rgba(0, 0, 0, 0.7)' },
                                { name: 'Koyu Gri', value: 'rgba(50, 50, 50, 0.7)' },
                                { name: 'Şeffaf', value: 'transparent' },
                                { name: 'Mavi', value: 'rgba(0, 0, 50, 0.7)' }
                              ].map(bg => (
                                <DropdownMenuItem 
                                  key={bg.value}
                                  onClick={() => setSubtitleStyle({...subtitleStyle, backgroundColor: bg.value})}
                                  className={subtitleStyle.backgroundColor === bg.value ? 'bg-primary/20' : ''}
                                >
                                  {bg.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuItem 
                          onClick={() => setSubtitleStyle({...subtitleStyle, textShadow: !subtitleStyle.textShadow})}
                        >
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              checked={subtitleStyle.textShadow}
                              className="mr-2"
                              readOnly
                            />
                            Gölge Efekti
                          </div>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Pozisyon</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="bg-dark-card text-white">
                              <DropdownMenuItem 
                                onClick={() => setSubtitleStyle({...subtitleStyle, position: 'bottom'})}
                                className={subtitleStyle.position === 'bottom' ? 'bg-primary/20' : ''}
                              >
                                Alt
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setSubtitleStyle({...subtitleStyle, position: 'middle'})}
                                className={subtitleStyle.position === 'middle' ? 'bg-primary/20' : ''}
                              >
                                Orta
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setSubtitleStyle({...subtitleStyle, position: 'top'})}
                                className={subtitleStyle.position === 'top' ? 'bg-primary/20' : ''}
                              >
                                Üst
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Ayarlar Menüsü */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:text-primary transition-colors"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-dark-card text-white">
                <DropdownMenuLabel>Oynatıcı Ayarları</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Oynatıcı Teması</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="bg-dark-card text-white">
                      <DropdownMenuRadioGroup value={playerTheme} onValueChange={(value) => setPlayerTheme(value as VideoPlayerTheme)}>
                        <DropdownMenuRadioItem value="dark">Karanlık</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="light">Aydınlık</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="anime">Anime</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="minimal">Minimal</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="classic">Klasik</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>Oynatma Hızı</DropdownMenuLabel>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={playbackRate === rate ? 'bg-primary/20' : ''}
                  >
                    {rate === 1 ? 'Normal' : `${rate}x`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
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
          </div>
        </div>
      </div>
    </div>
  );
}
