import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
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
  Rewind
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { formatTime } from '@/lib/utils';

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
  nextEpisodeAvailable = false
}: VideoPlayerProps) {
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

  return (
    <div 
      ref={containerRef}
      className="video-container relative aspect-video bg-black rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
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

      {/* Play overlay - visible when video is paused */}
      {!playing && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 cursor-pointer z-10"
          onClick={handlePlayPause}
        >
          <button 
            className="bg-primary hover:bg-primary-dark text-white p-6 rounded-full flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
          >
            <Play className="h-10 w-10" />
          </button>
        </div>
      )}

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
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSkipBackward}
                className="text-white hover:text-primary transition-colors"
                title="10 saniye geri"
              >
                <Rewind className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSkipForward}
                className="text-white hover:text-primary transition-colors"
                title="10 saniye ileri"
              >
                <Forward className="h-5 w-5" />
              </Button>
            </div>
            
            {subtitles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:text-primary transition-colors"
                    title="Altyazılar"
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:text-primary transition-colors"
                  title="Oynatma Hızı"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-dark-card text-white">
                <DropdownMenuLabel>Oynatma Hızı</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePictureInPicture}
              className="text-white hover:text-primary transition-colors"
              title="Resim İçinde Resim"
            >
              <PictureInPicture className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullscreen}
              className="text-white hover:text-primary transition-colors"
              title="Tam Ekran"
            >
              <Fullscreen className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
