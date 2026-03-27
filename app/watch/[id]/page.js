'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Film, Radio, Play, Search, X, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function WatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const { t } = useLanguage();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allChannels, setAllChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [channelSearch, setChannelSearch] = useState('');
  const [playerError, setPlayerError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const type = searchParams.get('type') || 'media';
  const isLiveTV = type === 'channel';

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    fetchItem(id);
    
    if (isLiveTV) {
      fetchAllChannels();
    }
    
    return () => {
      destroyHls();
    };
  }, []);

  useEffect(() => {
    if (channelSearch) {
      const filtered = allChannels.filter(ch => 
        ch.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
        (ch.groupTitle && ch.groupTitle.toLowerCase().includes(channelSearch.toLowerCase()))
      );
      setFilteredChannels(filtered);
    } else {
      setFilteredChannels(allChannels);
    }
  }, [channelSearch, allChannels]);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const fetchAllChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      if (response.ok) {
        const data = await response.json();
        setAllChannels(data.channels);
        setFilteredChannels(data.channels);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const fetchItem = async (id) => {
    try {
      const endpoint = type === 'channel' ? `/api/channels/${id}` : `/api/media/${id}`;
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        const itemData = type === 'channel' ? data.channel : data.media;

        if (itemData?.type === 'SERIES' && itemData.episodes?.length > 0) {
           const firstEp = itemData.episodes[0];
           router.replace(`/watch/${firstEp.id}?type=media`);
           return;
        }

        setItem(itemData);
        if (itemData?.type === 'EPISODE' && itemData.season) {
          setSelectedSeason(itemData.season);
        }
        setPlayerError(null);
        
        if (itemData?.url) {
          setTimeout(() => initializePlayer(itemData.url), 100);
        }
      } else {
        toast.error(t('contentNotFound'));
      }
    } catch (error) {
      toast.error(t('contentNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const switchChannel = (channel) => {
    destroyHls();
    setPlayerError(null);
    
    setItem(channel);
    setTimeout(() => initializePlayer(channel.url), 100);
    
    window.history.pushState({}, '', `/watch/${channel.id}?type=channel`);
  };

  const initializePlayer = async (url) => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerError(null);
    destroyHls();

    const isM3U8 = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8');

    if (isM3U8) {
      try {
        const HlsModule = await import('hls.js');
        const Hls = HlsModule.default;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            startLevel: -1,
            debug: false,
            xhrSetup: function(xhr, url) {
              xhr.withCredentials = false;
            }
          });
          
          hls.loadSource(url);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(err => {
              console.log('Autoplay prevented:', err);
            });
          });

          hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            console.log('Level loaded:', data.level);
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('Network error - trying to recover');
                  setPlayerError(t('networkError'));
                  setTimeout(() => {
                    hls.startLoad();
                  }, 2000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('Media error - trying to recover');
                  hls.recoverMediaError();
                  break;
                default:
                  setPlayerError(t('streamFailed'));
                  hls.destroy();
                  break;
              }
            }
          });
          
          hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('loadedmetadata', () => {
            video.play().catch(err => console.log('Autoplay prevented:', err));
          });
        } else {
          setPlayerError(t('browserNotSupported'));
        }
      } catch (error) {
        console.error('Failed to load HLS.js:', error);
        setPlayerError(t('streamFailed'));
      }
    } else {
      video.src = url;
      video.load();
      video.addEventListener('canplay', () => {
        video.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      }, { once: true });
      
      video.addEventListener('error', () => {
        setPlayerError(t('streamFailed'));
      }, { once: true });
    }
  };

  const handleRetry = () => {
    if (item?.url) {
      initializePlayer(item.url);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !item?.id || type !== 'media') return;
    
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    
    if (videoRef.current.currentTime % 10 < 1) {
      saveProgress(progress);
    }
  };

  const saveProgress = async (progress) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaItemId: item.id,
          progress,
          completed: progress > 90
        })
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="JellyTV" className="h-24 w-24 mx-auto mb-4 animate-pulse" />
          <p className="text-purple-200">{t('loadingPlayer')}</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
          <CardContent className="py-12 text-center">
            <img src="/logo.png" alt="JellyTV" className="h-16 w-16 mx-auto mb-4" />
            <p className="text-purple-200">{t('contentNotFound')}</p>
            <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => router.push('/')}>
              {t('goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #000000 0%, #1a0033 50%, #000000 100%)'
    }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
            className="border-purple-600 text-purple-300 hover:bg-purple-800/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <LanguageSwitcher />
        </div>

        <div className={`grid ${isLiveTV ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
          {/* Video Player */}
          <div className={isLiveTV ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <div className="relative bg-black rounded-lg overflow-hidden border border-purple-800/50 shadow-xl shadow-purple-900/20">
              {/* LIVE Badge for Live TV */}
              {isLiveTV && (
                <div className="absolute top-4 right-4 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
                  {t('live')}
                </div>
              )}
              
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full aspect-video bg-black"
                style={{ maxHeight: '80vh' }}
              >
                Your browser does not support the video tag.
              </video>

              {/* Error Overlay */}
              {playerError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
                  <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                  <p className="text-white text-center mb-4 px-4 text-lg">{playerError}</p>
                  <Button onClick={handleRetry} className="bg-purple-600 hover:bg-purple-700">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('retry')}
                  </Button>
                </div>
              )}
            </div>

            {/* Info below video */}
            <Card className="mt-4 bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardContent className="p-4">
                <h1 className="text-2xl font-bold text-purple-200">{item.title || item.name}</h1>
                {item.groupTitle && (
                  <p className="text-sm text-purple-400 mt-1">{item.groupTitle}</p>
                )}
                {item.metadata?.releaseYear && (
                  <p className="text-sm text-purple-400 mt-1">{item.metadata.releaseYear}</p>
                )}
                {item.metadata?.rating && (
                  <p className="text-lg font-semibold text-purple-300 mt-2">{t('rating')}: {item.metadata.rating.toFixed(1)}/10</p>
                )}
                {item.metadata?.overview && (
                  <p className="text-sm text-purple-200/80 mt-3">{item.metadata.overview}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className={isLiveTV ? 'lg:col-span-1' : 'lg:col-span-1'}>
            {isLiveTV ? (
              // Channel List for Live TV
              <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50 sticky top-4">
                <CardContent className="p-4">
                  <h2 className="text-xl font-bold text-purple-300 mb-4 flex items-center">
                    <Radio className="h-5 w-5 mr-2" />
                    {t('channels')} ({filteredChannels.length})
                  </h2>
                  
                  {/* Channel Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                    <Input
                      type="text"
                      placeholder={t('searchChannels')}
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      className="pl-9 pr-9 bg-black/40 border-purple-700/50 text-purple-100 text-sm"
                    />
                    {channelSearch && (
                      <button
                        onClick={() => setChannelSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-purple-400" />
                      </button>
                    )}
                  </div>

                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2 pr-2">
                      {filteredChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => switchChannel(channel)}
                          className={`w-full p-3 rounded-lg transition-all text-left ${
                            item?.id === channel.id
                              ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                              : 'bg-purple-900/20 hover:bg-purple-800/40 text-purple-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {channel.logo ? (
                              <img
                                src={channel.logo}
                                alt={channel.name}
                                className="w-10 h-10 object-contain rounded bg-black/40 p-1"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 bg-purple-900/30 rounded flex items-center justify-center flex-shrink-0">
                                <Radio className="h-5 w-5 text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{channel.name}</p>
                              {channel.groupTitle && (
                                <p className="text-xs opacity-70 truncate">{channel.groupTitle}</p>
                              )}
                            </div>
                            {item?.id === channel.id && (
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Season/Episode Selector for Series */}
                {item?.type === 'EPISODE' && item.series && (
                  <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                    <CardContent className="p-4">
                      <h2 className="text-xl font-bold text-purple-300 mb-4">{item.series.title}</h2>
                      
                      {/* Season Selector */}
                      <div className="mb-4">
                        <Select
                          value={selectedSeason.toString()}
                          onValueChange={(val) => setSelectedSeason(parseInt(val))}
                        >
                          <SelectTrigger className="bg-black/40 border-purple-700/50 text-purple-100">
                            <SelectValue placeholder="Sezon Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...new Set((item.series.episodes || []).map(ep => ep.season))]
                              .filter(Boolean)
                              .sort((a,b) => a - b)
                              .map(s => (
                                <SelectItem key={s} value={s.toString()}>{t('season')} {s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Episode List */}
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2 pr-2">
                          {(item.series.episodes || [])
                            .filter(ep => ep.season === selectedSeason)
                            .sort((a,b) => a.episode - b.episode)
                            .map(ep => (
                              <button
                                key={ep.id}
                                onClick={() => router.push(`/watch/${ep.id}?type=media`)}
                                className={`w-full p-3 rounded-lg transition-all text-left ${
                                  item.id === ep.id
                                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                                    : 'bg-purple-900/20 hover:bg-purple-800/40 text-purple-200'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {ep.episode}. {t('episode')} {ep.title && !ep.title.includes('S' + ep.season) ? `- ${ep.title}` : ''}
                                    </p>
                                  </div>
                                  {item.id === ep.id && (
                                    <div className="flex-shrink-0">
                                      <Play className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata Panel for Movies/Series */}
                <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50 sticky top-4">
                  <CardContent className="p-6 space-y-4">
                    {item.metadata?.poster && (
                      <img
                        src={item.metadata.poster}
                        alt={item.title}
                        className="w-full rounded-lg shadow-lg"
                      />
                    )}

                    {item.metadata?.genres && (
                      <div>
                        <h3 className="font-semibold text-purple-300 mb-2">{t('genres')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(item.metadata.genres).map((genre, idx) => (
                            <span
                              key={idx}
                              className="bg-purple-600/30 text-purple-200 px-3 py-1 rounded-full text-sm"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.metadata?.runtime ? (
                      <div>
                        <h3 className="font-semibold text-purple-300 mb-2">{t('runtime')}</h3>
                        <p className="text-sm text-purple-200">{item.metadata.runtime} {t('minutes')}</p>
                      </div>
                    ) : null}

                    {item.category && (
                      <div>
                        <h3 className="font-semibold text-purple-300 mb-2">{t('category')}</h3>
                        <p className="text-sm text-purple-200">{item.category.name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <img src="/logo.png" alt="JellyTV" className="h-24 w-24 animate-pulse" />
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  );
}
