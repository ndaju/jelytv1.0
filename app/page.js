'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Film, Tv, Radio, LogOut, User, Play, Search, X, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [media, setMedia] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterYear, setFilterYear] = useState('all');
  const [filterRating, setFilterRating] = useState('all');

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        if (data.user.role === 'user' && data.user.subscriptionEnd) {
          const expiry = new Date(data.user.subscriptionEnd);
          if (expiry < new Date()) {
            setSubscriptionExpired(true);
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [categoriesRes, mediaRes, channelsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/media'),
        fetch('/api/channels')
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories);
      }

      if (mediaRes.ok) {
        const data = await mediaRes.json();
        setMedia(data.media);
      }

      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels);
      }
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navigateToWatch = (id, type) => {
    if (subscriptionExpired) return;
    router.push(`/watch/${id}?type=${type}`);
  };

  const selectedCategoryInfo = selectedCategory ? categories.find(c => c.id === selectedCategory) : null;
  const categoryType = selectedCategoryInfo?.type || 'all';

  useEffect(() => {
    if (selectedCategory && selectedCategoryInfo) {
      if (categoryType === 'movies') {
        setActiveTab('movies');
      } else if (categoryType === 'series') {
        setActiveTab('series');
      } else if (categoryType === 'channels') {
        setActiveTab('live');
      }
    }
  }, [selectedCategory, categoryType]);

  const filterContent = (items) => {
    let filtered = items;
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.categoryId === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.metadata?.title && item.metadata.title.toLowerCase().includes(query))
      );
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.metadata?.releaseYear) return false;
        const year = item.metadata.releaseYear;
        if (filterYear === '2024+') return year >= 2024;
        if (filterYear === '2020-2023') return year >= 2020 && year < 2024;
        if (filterYear === '2010-2019') return year >= 2010 && year < 2020;
        if (filterYear === 'older') return year < 2010;
        return true;
      });
    }

    if (filterRating !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.metadata?.rating) return false;
        const rating = item.metadata.rating;
        if (filterRating === '8+') return rating >= 8;
        if (filterRating === '6-8') return rating >= 6 && rating < 8;
        if (filterRating === '4-6') return rating >= 4 && rating < 6;
        return true;
      });
    }

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => {
        const titleA = (a.title || a.name || '').toLowerCase();
        const titleB = (b.title || b.name || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.metadata?.rating || 0) - (a.metadata?.rating || 0));
    }
    
    return filtered;
  };

  const movies = filterContent(media.filter(m => m.type === 'MOVIE'));
  const series = filterContent(media.filter(m => m.type === 'SERIES' || (m.type === 'EPISODE' && !m.seriesId)));
  const liveChannels = filterContent(channels);
  const allContent = [...movies, ...series, ...liveChannels.map(c => ({...c, type: 'CHANNEL'}))];

  const showAllTabs = categoryType === 'all' || !selectedCategory;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="JellyTV" className="h-24 w-24 mx-auto mb-4 animate-pulse" />
          <p className="text-purple-200">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (subscriptionExpired) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-purple-800/50 bg-black/60 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="JellyTV" className="h-10 w-10" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">JellyTV</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button variant="outline" onClick={handleLogout} className="border-purple-600 text-purple-300 hover:bg-purple-800/50">
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </header>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Card className="max-w-md mx-4 bg-black/60 backdrop-blur-xl border-purple-800/50">
            <CardContent className="py-12 text-center space-y-4">
              <img src="/logo.png" alt="JellyTV" className="h-20 w-20 mx-auto mb-4" />
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
                <p className="font-medium">{t('subscriptionExpired')}</p>
                {user?.subscriptionEnd && (
                  <p className="text-sm mt-2">{t('expiredOn')}: {new Date(user.subscriptionEnd).toLocaleDateString()}</p>
                )}
              </div>
              <p className="text-purple-200/70">{t('contactOwner')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-purple-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="JellyTV" className="h-10 w-10" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">JellyTV</h1>
              </div>
              <div className="flex items-center space-x-4">
                <LanguageSwitcher />
                {user && (
                  <div className="flex items-center space-x-2 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-700/50">
                    <User className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-200">{user.username}</span>
                    {user.role === 'owner' && (
                      <Button size="sm" variant="outline" onClick={() => router.push('/owner')} className="ml-2 border-purple-600 text-purple-300 hover:bg-purple-800/50">
                        {t('ownerDashboard')}
                      </Button>
                    )}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-purple-600 text-purple-300 hover:bg-purple-800/50">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="JellyTV" className="h-24 w-24 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-purple-300 mb-4">{t('selectCategory')}</h2>
            <p className="text-purple-200/70">{t('selectCategoryDesc')}</p>
          </div>

          {categories.length === 0 ? (
            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50 max-w-md mx-auto">
              <CardContent className="py-12 text-center">
                <Film className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                <p className="text-purple-200">{t('noCategories')}</p>
                <p className="text-sm text-purple-400 mt-2">{t('noCategoriesDesc')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all bg-black/60 backdrop-blur-xl border-purple-800/50 group"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-purple-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      {category.type === 'movies' && <Film className="h-8 w-8 text-white" />}
                      {category.type === 'series' && <Tv className="h-8 w-8 text-white" />}
                      {category.type === 'channels' && <Radio className="h-8 w-8 text-white" />}
                      {(!category.type || category.type === 'all') && <Play className="h-8 w-8 text-white" />}
                    </div>
                    <h3 className="font-semibold text-lg text-purple-200 mb-2">{category.name}</h3>
                    {category.type && category.type !== 'all' && (
                      <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
                        {category.type === 'movies' ? t('moviesOnly') : category.type === 'series' ? t('seriesOnly') : t('liveTVOnly')}
                      </span>
                    )}
                    {category._count && (
                      <p className="text-xs text-purple-400 mt-2">
                        {category._count.mediaItems + category._count.channels} {t('items')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-purple-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="JellyTV" className="h-10 w-10" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">JellyTV</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              {user && (
                <div className="flex items-center space-x-2 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-700/50">
                  <User className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-200">{user.username}</span>
                  {user.role === 'owner' && (
                    <Button size="sm" variant="outline" onClick={() => router.push('/owner')} className="ml-2 border-purple-600 text-purple-300 hover:bg-purple-800/50">
                      {t('ownerDashboard')}
                    </Button>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-purple-600 text-purple-300 hover:bg-purple-800/50">
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-black/40 border-purple-700/50 text-purple-100 placeholder:text-purple-400/50 focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-purple-700 hover:bg-purple-900/50 ${showFilters ? 'bg-purple-800/50 text-purple-200' : 'text-purple-300'}`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t('filters')}
            </Button>
          </div>

          {showFilters && (
            <div className="mb-4 p-4 bg-black/40 border border-purple-700/50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-purple-200 mb-2 block">{t('sortBy')}</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-black/40 border-purple-700/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t('newest')}</SelectItem>
                      <SelectItem value="oldest">{t('oldest')}</SelectItem>
                      <SelectItem value="title">{t('titleAZ')}</SelectItem>
                      <SelectItem value="rating">{t('ratingHighLow')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-purple-200 mb-2 block">{t('releaseYear')}</label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="bg-black/40 border-purple-700/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allYears')}</SelectItem>
                      <SelectItem value="2024+">2024 {t('andNewer')}</SelectItem>
                      <SelectItem value="2020-2023">2020-2023</SelectItem>
                      <SelectItem value="2010-2019">2010-2019</SelectItem>
                      <SelectItem value="older">{t('before')} 2010</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-purple-200 mb-2 block">{t('rating')}</label>
                  <Select value={filterRating} onValueChange={setFilterRating}>
                    <SelectTrigger className="bg-black/40 border-purple-700/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allRatings')}</SelectItem>
                      <SelectItem value="8+">8+ {t('stars')}</SelectItem>
                      <SelectItem value="6-8">6-8 {t('stars')}</SelectItem>
                      <SelectItem value="4-6">4-6 {t('stars')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCategory(null)}
              className="border-purple-700 text-purple-300 hover:bg-purple-900/50"
            >
              {t('backToCategories')}
            </Button>
            <span className="text-purple-400">|</span>
            <span className="text-purple-200 font-medium">
              {selectedCategoryInfo?.name}
              {selectedCategoryInfo?.type && selectedCategoryInfo.type !== 'all' && (
                <span className="ml-2 text-xs text-purple-400">
                  ({selectedCategoryInfo.type === 'movies' ? t('moviesOnly') : selectedCategoryInfo.type === 'series' ? t('seriesOnly') : t('liveTVOnly')})
                </span>
              )}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!showAllTabs ? (
          <div>
            {categoryType === 'movies' && (
              <>
                <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
                  <Film className="h-6 w-6 mr-2" />{t('movies')} <span className="ml-2 text-sm text-purple-400">({movies.length})</span>
                </h2>
                {movies.length === 0 ? (
                  <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                    <CardContent className="py-12 text-center">
                      <Film className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                      <p className="text-purple-200">{t('noResults')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {movies.map((item) => (
                      <ContentCard key={item.id} item={item} onWatch={navigateToWatch} t={t} />
                    ))}
                  </div>
                )}
              </>
            )}
            {categoryType === 'series' && (
              <>
                <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
                  <Tv className="h-6 w-6 mr-2" />{t('series')} <span className="ml-2 text-sm text-purple-400">({series.length})</span>
                </h2>
                {series.length === 0 ? (
                  <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                    <CardContent className="py-12 text-center">
                      <Tv className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                      <p className="text-purple-200">{t('noResults')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {series.map((item) => (
                      <ContentCard key={item.id} item={item} onWatch={navigateToWatch} t={t} />
                    ))}
                  </div>
                )}
              </>
            )}
            {categoryType === 'channels' && (
              <>
                <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
                  <Radio className="h-6 w-6 mr-2" />{t('liveTV')} <span className="ml-2 text-sm text-purple-400">({liveChannels.length})</span>
                </h2>
                {liveChannels.length === 0 ? (
                  <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                    <CardContent className="py-12 text-center">
                      <Radio className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                      <p className="text-purple-200">{t('noResults')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {liveChannels.map((channel) => (
                      <Card
                        key={channel.id}
                        className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all bg-black/60 backdrop-blur-xl border-purple-800/50"
                        onClick={() => navigateToWatch(channel.id, 'channel')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            {channel.logo ? (
                              <img src={channel.logo} alt={channel.name} className="w-12 h-12 object-contain rounded bg-black/40 p-1" />
                            ) : (
                              <div className="w-12 h-12 bg-purple-900/30 rounded flex items-center justify-center">
                                <Radio className="h-6 w-6 text-purple-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-medium text-sm text-purple-200">{channel.name}</h3>
                              {channel.groupTitle && <p className="text-xs text-purple-400">{channel.groupTitle}</p>}
                            </div>
                            <Play className="h-5 w-5 text-purple-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-black/60 border border-purple-800/50 mb-6">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">{t('all')}</TabsTrigger>
              <TabsTrigger value="movies" className="data-[state=active]:bg-purple-600">
                <Film className="h-4 w-4 mr-2" />{t('movies')}
              </TabsTrigger>
              <TabsTrigger value="series" className="data-[state=active]:bg-purple-600">
                <Tv className="h-4 w-4 mr-2" />{t('series')}
              </TabsTrigger>
              <TabsTrigger value="live" className="data-[state=active]:bg-purple-600">
                <Radio className="h-4 w-4 mr-2" />{t('liveTV')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {allContent.length === 0 ? (
                <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                  <CardContent className="py-12 text-center">
                    <Film className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                    <p className="text-purple-200">{t('noResults')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {allContent.map((item) => (
                    <ContentCard key={item.id} item={item} onWatch={navigateToWatch} t={t} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="movies">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
                <Film className="h-6 w-6 mr-2" />{t('movies')} <span className="ml-2 text-sm text-purple-400">({movies.length})</span>
              </h2>
              {movies.length === 0 ? (
                <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                  <CardContent className="py-12 text-center">
                    <Film className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                    <p className="text-purple-200">{t('noResults')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {movies.map((item) => (
                    <ContentCard key={item.id} item={item} onWatch={navigateToWatch} t={t} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="series">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
                <Tv className="h-6 w-6 mr-2" />{t('series')} <span className="ml-2 text-sm text-purple-400">({series.length})</span>
              </h2>
              {series.length === 0 ? (
                <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                  <CardContent className="py-12 text-center">
                    <Tv className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                    <p className="text-purple-200">{t('noResults')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {series.map((item) => (
                    <ContentCard key={item.id} item={item} onWatch={navigateToWatch} t={t} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="live">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
                <Radio className="h-6 w-6 mr-2" />{t('liveTV')} <span className="ml-2 text-sm text-purple-400">({liveChannels.length})</span>
              </h2>
              {liveChannels.length === 0 ? (
                <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
                  <CardContent className="py-12 text-center">
                    <Radio className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                    <p className="text-purple-200">{t('noResults')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {liveChannels.map((channel) => (
                    <Card
                      key={channel.id}
                      className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all bg-black/60 backdrop-blur-xl border-purple-800/50"
                      onClick={() => navigateToWatch(channel.id, 'channel')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          {channel.logo ? (
                            <img src={channel.logo} alt={channel.name} className="w-12 h-12 object-contain rounded bg-black/40 p-1" />
                          ) : (
                            <div className="w-12 h-12 bg-purple-900/30 rounded flex items-center justify-center">
                              <Radio className="h-6 w-6 text-purple-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium text-sm text-purple-200">{channel.name}</h3>
                            {channel.groupTitle && <p className="text-xs text-purple-400">{channel.groupTitle}</p>}
                          </div>
                          <Play className="h-5 w-5 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function ContentCard({ item, onWatch, t }) {
  const isChannel = item.type === 'CHANNEL';
  
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all bg-black/60 backdrop-blur-xl border-purple-800/50 group"
      onClick={() => onWatch(item.id, isChannel ? 'channel' : 'media')}
    >
      <div className="relative aspect-[2/3] bg-gradient-to-br from-purple-900/20 to-black">
        {item.metadata?.poster ? (
          <img src={item.metadata.poster} alt={item.title || item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-12 w-12 text-purple-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-12 w-12 text-white drop-shadow-lg" />
        </div>
        {item.type && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded shadow-lg">
            {item.type === 'MOVIE' ? t('movie') : (item.type === 'EPISODE' || item.type === 'SERIES') ? t('series') : t('live')}
          </div>
        )}
      </div>
      <CardContent className="p-3 bg-gradient-to-b from-black/80 to-black">
        <h3 className="font-medium text-sm line-clamp-2 text-purple-100">{item.title || item.name}</h3>
        {item.metadata?.releaseYear && <p className="text-xs text-purple-400 mt-1">{item.metadata.releaseYear}</p>}
        {item.metadata?.rating && <p className="text-xs text-purple-400">{t('rating')}: {item.metadata.rating.toFixed(1)}</p>}
      </CardContent>
    </Card>
  );
}
