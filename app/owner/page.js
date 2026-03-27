'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Film, Users, FolderOpen, Upload, Link as LinkIcon, LogOut, Search, Plus, X, CheckCircle, Trash2, Radio, Tv, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function OwnerDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allMedia, setAllMedia] = useState([]);
  const [allChannels, setAllChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  // User form
  const [newUser, setNewUser] = useState({ username: '', password: '', subscriptionEnd: '' });
  
  // Category form
  const [newCategory, setNewCategory] = useState({ name: '', description: '', type: 'all' });
  
  // Media form
  const [mediaForm, setMediaForm] = useState({
    title: '',
    url: '',
    type: 'MOVIE',
    categoryId: ''
  });
  
  // Episode/Series form
  const [seriesName, setSeriesName] = useState('');
  const [episodes, setEpisodes] = useState([{ season: 1, episode: 1, title: '', url: '' }]);
  const [seriesCategory, setSeriesCategory] = useState('');
  
  const [tmdbSearch, setTmdbSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [searchingTmdb, setSearchingTmdb] = useState(false);

  // Playlist form
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [playlistCategory, setPlaylistCategory] = useState('');
  const [playlistFile, setPlaylistFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('url');

  // Media upload
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingPlaylist, setUploadingPlaylist] = useState(false);
  const [addingSeries, setAddingSeries] = useState(false);

  // Content management
  const [contentSearch, setContentSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editingItemForm, setEditingItemForm] = useState({ title: '', url: '', categoryId: '', poster: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, categoriesRes, mediaRes, channelsRes] = await Promise.all([
        fetch('/api/owner/users'),
        fetch('/api/owner/categories'),
        fetch('/api/owner/media'),
        fetch('/api/owner/channels')
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories);
      }

      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setAllMedia(mediaData.media || []);
      }

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setAllChannels(channelsData.channels || []);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/owner/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        toast.success(t('userCreated'));
        setNewUser({ username: '', password: '', subscriptionEnd: '' });
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      const response = await fetch(`/api/owner/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(!isActive ? t('userEnabled') : t('userDisabled'));
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const updateSubscription = async (userId, subscriptionEnd) => {
    try {
      const response = await fetch(`/api/owner/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionEnd })
      });

      if (response.ok) {
        toast.success(t('subscriptionUpdated'));
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/owner/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        toast.success(t('categoryCreated'));
        setNewCategory({ name: '', description: '', type: 'all' });
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/owner/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success(t('categoryDeleted'));
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const deleteMedia = async (mediaId) => {
    if (!confirm('Bu medyayı silmek istediğinize emin misiniz?')) return;
    
    setDeletingId(mediaId);
    try {
      const response = await fetch(`/api/owner/media/${mediaId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success(t('mediaDeleted'));
        fetchData();
      } else {
        toast.error('Failed to delete media');
      }
    } catch (error) {
      toast.error('Failed to delete media');
    } finally {
      setDeletingId(null);
    }
  };

  const deleteChannel = async (channelId) => {
    if (!confirm('Bu kanalı silmek istediğinize emin misiniz?')) return;
    
    setDeletingId(channelId);
    try {
      const response = await fetch(`/api/owner/channels/${channelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Kanal silindi');
        fetchData();
      } else {
        toast.error('Failed to delete channel');
      }
    } catch (error) {
      toast.error('Failed to delete channel');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditingItemForm({
      title: item.title,
      url: item.url || '',
      categoryId: item.categoryId || '',
      poster: item.metadata?.poster || ''
    });
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
       const response = await fetch(`/api/owner/media/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingItemForm.title,
            url: editingItemForm.url,
            categoryId: editingItemForm.categoryId,
            metadata: { poster: editingItemForm.poster }
          })
       });
       if(response.ok) {
          toast.success('Başarıyla güncellendi');
          fetchData();
          closeEditModal();
       } else {
          toast.error('Guncelleme basarisiz');
       }
    } catch(err) {
       toast.error('Hata olustu');
    }
    setSavingEdit(false);
  };

  const deleteAllMovies = async () => {
    if (!confirm('TÜM FİLMLERİ silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
    setDeletingAll('movies');
    try {
      const response = await fetch('/api/owner/media/delete-all?type=MOVIE', {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.count} film silindi`);
        fetchData();
      } else {
        toast.error('Failed to delete movies');
      }
    } catch (error) {
      toast.error('Failed to delete movies');
    } finally {
      setDeletingAll(null);
    }
  };

  const deleteAllSeries = async () => {
    if (!confirm('TÜM DİZİLERİ silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
    setDeletingAll('series');
    try {
      const response = await fetch('/api/owner/media/delete-all?type=SERIES', {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.count} dizi silindi`);
        fetchData();
      } else {
        toast.error('Failed to delete series');
      }
    } catch (error) {
      toast.error('Failed to delete series');
    } finally {
      setDeletingAll(null);
    }
  };

  const deleteAllChannels = async () => {
    if (!confirm('TÜM CANLI TV KANALLARINI silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
    setDeletingAll('channels');
    try {
      const response = await fetch('/api/owner/channels/delete-all', {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.count} kanal silindi`);
        fetchData();
      } else {
        toast.error('Failed to delete channels');
      }
    } catch (error) {
      toast.error('Failed to delete channels');
    } finally {
      setDeletingAll(null);
    }
  };

  const searchTmdb = async () => {
    if (!tmdbSearch.trim()) return;

    setSearchingTmdb(true);
    try {
      const response = await fetch(`/api/owner/tmdb/search?q=${encodeURIComponent(tmdbSearch)}&type=${mediaForm.type === 'MOVIE' ? 'movie' : 'tv'}`);
      const data = await response.json();
      setTmdbResults(data.results || []);
    } catch (error) {
      toast.error('TMDB search failed');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const selectTmdbResult = async (result) => {
    try {
      const type = mediaForm.type === 'MOVIE' ? 'movie' : 'tv';
      const response = await fetch(`/api/owner/tmdb/details?id=${result.id}&type=${type}`);
      const data = await response.json();
      
      setSelectedMetadata(data.metadata);
      setMediaForm(prev => ({
        ...prev,
        title: data.metadata.title
      }));
      toast.success(t('metadataLoaded'));
    } catch (error) {
      toast.error('Failed to load metadata');
    }
  };

  // Episode management functions
  const addEpisode = () => {
    const lastEpisode = episodes[episodes.length - 1];
    setEpisodes([...episodes, { 
      season: lastEpisode.season, 
      episode: lastEpisode.episode + 1, 
      title: '', 
      url: '' 
    }]);
  };

  const removeEpisode = (index) => {
    if (episodes.length > 1) {
      setEpisodes(episodes.filter((_, i) => i !== index));
    }
  };

  const updateEpisode = (index, field, value) => {
    const updated = [...episodes];
    updated[index][field] = field === 'season' || field === 'episode' ? parseInt(value) || 1 : value;
    setEpisodes(updated);
  };

  const addSeries = async (e) => {
    e.preventDefault();
    if (!seriesName.trim() || episodes.some(ep => !ep.url.trim())) {
      toast.error('Lütfen dizi adı ve tüm bölüm URL\'lerini girin');
      return;
    }

    setAddingSeries(true);
    try {
      // Add each episode
      for (const ep of episodes) {
        const episodeTitle = ep.title || `${seriesName} S${ep.season}E${ep.episode}`;
        
        const response = await fetch('/api/owner/media/add-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: episodeTitle,
            url: ep.url,
            type: 'EPISODE',
            categoryId: seriesCategory || null,
            season: ep.season,
            episode: ep.episode,
            seriesName: seriesName,
            metadata: selectedMetadata
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to add episode ${ep.season}x${ep.episode}`);
        }
      }

      toast.success(`${episodes.length} bölüm eklendi`);
      setSeriesName('');
      setEpisodes([{ season: 1, episode: 1, title: '', url: '' }]);
      setSeriesCategory('');
      setSelectedMetadata(null);
      setTmdbResults([]);
      setTmdbSearch('');
      fetchData();
    } catch (error) {
      toast.error('Bölümler eklenirken hata oluştu');
    } finally {
      setAddingSeries(false);
    }
  };

  const addMedia = async (e) => {
    e.preventDefault();

    try {
      if (mediaFile) {
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('type', 'media');
        formData.append('title', mediaForm.title);
        formData.append('categoryId', mediaForm.categoryId || '');

        const response = await fetch('/api/owner/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          toast.success(t('mediaAdded'));
          setMediaForm({ title: '', url: '', type: 'MOVIE', categoryId: '' });
          setMediaFile(null);
          setSelectedMetadata(null);
          setTmdbResults([]);
          setTmdbSearch('');
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Upload failed');
        }
        setUploadingMedia(false);
      } else {
        const response = await fetch('/api/owner/media/add-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mediaForm,
            metadata: selectedMetadata
          })
        });

        if (response.ok) {
          toast.success(t('mediaAdded'));
          setMediaForm({ title: '', url: '', type: 'MOVIE', categoryId: '' });
          setSelectedMetadata(null);
          setTmdbResults([]);
          setTmdbSearch('');
          fetchData();
        }
      }
    } catch (error) {
      toast.error('Failed to add media');
      setUploadingMedia(false);
    }
  };

  const importPlaylist = async (e) => {
    e.preventDefault();

    try {
      if (uploadMode === 'file' && playlistFile) {
        setUploadingPlaylist(true);
        const formData = new FormData();
        formData.append('file', playlistFile);
        formData.append('type', 'playlist');
        formData.append('title', playlistName);
        formData.append('categoryId', playlistCategory || '');

        const response = await fetch('/api/owner/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(`Playlist içe aktarıldı: ${data.channelsCount} kanal`);
          setPlaylistFile(null);
          setPlaylistName('');
          setPlaylistCategory('');
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Upload failed');
        }
        setUploadingPlaylist(false);
      } else {
        const response = await fetch('/api/owner/playlists/import-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: playlistUrl,
            name: playlistName,
            categoryId: playlistCategory || null
          })
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(`Playlist içe aktarıldı: ${data.channelsCount} kanal`);
          setPlaylistUrl('');
          setPlaylistName('');
          setPlaylistCategory('');
          fetchData();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Failed to import playlist');
        }
      }
    } catch (error) {
      toast.error('Failed to import playlist');
      setUploadingPlaylist(false);
    }
  };

  // Filter content based on search
  const filteredMedia = allMedia.filter(m => 
    m.title?.toLowerCase().includes(contentSearch.toLowerCase()) ||
    m.category?.name?.toLowerCase().includes(contentSearch.toLowerCase())
  );

  const filteredChannels = allChannels.filter(c => 
    c.name?.toLowerCase().includes(contentSearch.toLowerCase()) ||
    c.groupTitle?.toLowerCase().includes(contentSearch.toLowerCase())
  );

  const moviesCount = allMedia.filter(m => m.type === 'MOVIE').length;
  const seriesCount = allMedia.filter(m => m.type === 'SERIES' || (m.type === 'EPISODE' && !m.seriesId)).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="JellyTV" className="h-16 w-16 mx-auto mb-4 animate-pulse" />
          <p className="text-purple-200">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-purple-800/50 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="JellyTV" className="h-10 w-10" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">{t('ownerDashboard')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push('/')} className="border-purple-600 text-purple-300 hover:bg-purple-800/50">
              <Film className="h-4 w-4 mr-2" />
              {t('viewSite')}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-purple-600 text-purple-300 hover:bg-purple-800/50">
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              {t('users')}
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FolderOpen className="h-4 w-4 mr-2" />
              {t('categories')}
            </TabsTrigger>
            <TabsTrigger value="media">
              <Film className="h-4 w-4 mr-2" />
              {t('addMedia')}
            </TabsTrigger>
            <TabsTrigger value="playlists">
              <Upload className="h-4 w-4 mr-2" />
              {t('playlists')}
            </TabsTrigger>
            <TabsTrigger value="content">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('manageContent')}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300">{t('createUser')}</CardTitle>
                <CardDescription className="text-purple-200/70">{t('createUserDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('username')}</Label>
                      <Input
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        required
                        className="bg-black/40 border-purple-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('password')}</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        required
                        className="bg-black/40 border-purple-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('subscriptionEndOptional')}</Label>
                      <Input
                        type="date"
                        value={newUser.subscriptionEnd}
                        onChange={(e) => setNewUser({ ...newUser, subscriptionEnd: e.target.value })}
                        className="bg-black/40 border-purple-700/50"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('createUser')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300">{t('manageUsers')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('username')}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>{t('subscriptionEnd')}</TableHead>
                      <TableHead>{t('created')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-purple-200">{user.username}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {user.isActive ? t('active') : t('disabled')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={user.subscriptionEnd ? new Date(user.subscriptionEnd).toISOString().split('T')[0] : ''}
                            onChange={(e) => updateSubscription(user.id, e.target.value)}
                            className="w-40 bg-black/40 border-purple-700/50"
                          />
                        </TableCell>
                        <TableCell className="text-purple-300">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={user.isActive ? 'destructive' : 'default'}
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                          >
                            {user.isActive ? t('disable') : t('enable')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300">{t('createCategory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createCategory} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('categoryName')}</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        required
                        className="bg-black/40 border-purple-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('categoryDescription')}</Label>
                      <Input
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        className="bg-black/40 border-purple-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('categoryType')}</Label>
                      <Select
                        value={newCategory.type}
                        onValueChange={(value) => setNewCategory({ ...newCategory, type: value })}
                      >
                        <SelectTrigger className="bg-black/40 border-purple-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('allContent')}</SelectItem>
                          <SelectItem value="movies">{t('moviesOnly')}</SelectItem>
                          <SelectItem value="series">{t('seriesOnly')}</SelectItem>
                          <SelectItem value="channels">{t('liveTVOnly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('createCategory')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300">{t('categories')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="bg-purple-900/20 border-purple-700/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-purple-200">
                          {category.name}
                          {category.type && category.type !== 'all' && (
                            <span className="text-xs bg-purple-600/30 px-2 py-1 rounded">
                              {category.type === 'movies' ? t('moviesOnly') : category.type === 'series' ? t('seriesOnly') : t('liveTVOnly')}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-purple-300">{category.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCategory(category.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          {t('delete')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            {/* Movie/Single Media Form */}
            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300 flex items-center">
                  <Film className="h-5 w-5 mr-2" />
                  Film Ekle
                </CardTitle>
                <CardDescription className="text-purple-200/70">Tek film veya video ekleyin</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addMedia} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('category')}</Label>
                      <Select
                        value={mediaForm.categoryId}
                        onValueChange={(value) => setMediaForm({ ...mediaForm, categoryId: value })}
                      >
                        <SelectTrigger className="bg-black/40 border-purple-700/50">
                          <SelectValue placeholder={t('selectCategory2')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('title')}</Label>
                      <Input
                        value={mediaForm.title}
                        onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                        required
                        className="bg-black/40 border-purple-700/50 text-purple-100"
                        placeholder={t('enterTitle')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-purple-200">TMDB'de Ara (İsteğe bağlı)</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Film adını yazın..."
                        value={tmdbSearch}
                        onChange={(e) => {
                          setTmdbSearch(e.target.value);
                          setMediaForm({ ...mediaForm, type: 'MOVIE' });
                        }}
                        className="bg-black/40 border-purple-700/50 text-purple-100"
                      />
                      <Button type="button" onClick={() => {
                        setMediaForm({ ...mediaForm, type: 'MOVIE' });
                        searchTmdb();
                      }} disabled={searchingTmdb} className="bg-purple-600 hover:bg-purple-700">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {tmdbResults.length > 0 && mediaForm.type === 'MOVIE' && (
                    <div className="border border-purple-700/50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto bg-black/40">
                      {tmdbResults.slice(0, 5).map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-2 hover:bg-purple-900/30 rounded cursor-pointer"
                          onClick={() => selectTmdbResult(result)}
                        >
                          <div className="flex items-center space-x-3">
                            {result.poster_path && (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                alt={result.title || result.name}
                                className="w-10 h-14 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium text-purple-200">{result.title || result.name}</p>
                              <p className="text-sm text-purple-400">
                                {result.release_date || result.first_air_date}
                              </p>
                            </div>
                          </div>
                          {selectedMetadata?.tmdbId === result.id && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-purple-200">{t('streamURL')}</Label>
                    <Input
                      value={mediaForm.url}
                      onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
                      placeholder="https://example.com/video.mp4"
                      className="bg-black/40 border-purple-700/50 text-purple-100"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={uploadingMedia || !mediaForm.url}
                    className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                  >
                    {uploadingMedia ? t('uploading') : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Film Ekle
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Series/Episode Form */}
            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300 flex items-center">
                  <Tv className="h-5 w-5 mr-2" />
                  Dizi / Bölüm Ekle
                </CardTitle>
                <CardDescription className="text-purple-200/70">Sezon ve bölüm bazlı dizi ekleyin</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addSeries} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200">Dizi Adı</Label>
                      <Input
                        value={seriesName}
                        onChange={(e) => setSeriesName(e.target.value)}
                        required
                        className="bg-black/40 border-purple-700/50 text-purple-100"
                        placeholder="Örn: Breaking Bad"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-200">{t('category')}</Label>
                      <Select
                        value={seriesCategory}
                        onValueChange={(value) => setSeriesCategory(value)}
                      >
                        <SelectTrigger className="bg-black/40 border-purple-700/50">
                          <SelectValue placeholder={t('selectCategory2')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* TMDB Search for Series */}
                  <div className="space-y-2">
                    <Label className="text-purple-200">TMDB'de Dizi Ara (İsteğe bağlı)</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Dizi adını yazın..."
                        value={tmdbSearch}
                        onChange={(e) => setTmdbSearch(e.target.value)}
                        className="bg-black/40 border-purple-700/50 text-purple-100"
                      />
                      <Button type="button" onClick={() => {
                        setMediaForm(prev => ({ ...prev, type: 'EPISODE' }));
                        searchTmdb();
                      }} disabled={searchingTmdb} className="bg-purple-600 hover:bg-purple-700">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {tmdbResults.length > 0 && (
                    <div className="border border-purple-700/50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto bg-black/40">
                      {tmdbResults.slice(0, 5).map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-2 hover:bg-purple-900/30 rounded cursor-pointer"
                          onClick={() => selectTmdbResult(result)}
                        >
                          <div className="flex items-center space-x-3">
                            {result.poster_path && (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                alt={result.title || result.name}
                                className="w-10 h-14 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium text-purple-200">{result.title || result.name}</p>
                              <p className="text-sm text-purple-400">
                                {result.release_date || result.first_air_date}
                              </p>
                            </div>
                          </div>
                          {selectedMetadata?.tmdbId === result.id && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Episodes List */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-purple-200 text-lg">Bölümler</Label>
                      <Button type="button" onClick={addEpisode} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-1" />
                        Bölüm Ekle
                      </Button>
                    </div>
                    
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-3 pr-4">
                        {episodes.map((ep, index) => (
                          <div key={index} className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-purple-300 font-medium">Bölüm {index + 1}</span>
                              {episodes.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeEpisode(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-purple-200 text-sm">Sezon</Label>
                                <Select
                                  value={ep.season.toString()}
                                  onValueChange={(value) => updateEpisode(index, 'season', value)}
                                >
                                  <SelectTrigger className="bg-black/40 border-purple-700/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(s => (
                                      <SelectItem key={s} value={s.toString()}>Sezon {s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-purple-200 text-sm">Bölüm No</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={ep.episode}
                                  onChange={(e) => updateEpisode(index, 'episode', e.target.value)}
                                  className="bg-black/40 border-purple-700/50 text-purple-100"
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-purple-200 text-sm">Bölüm Başlığı (İsteğe bağlı)</Label>
                                <Input
                                  value={ep.title}
                                  onChange={(e) => updateEpisode(index, 'title', e.target.value)}
                                  placeholder="Örn: Pilot"
                                  className="bg-black/40 border-purple-700/50 text-purple-100"
                                />
                              </div>
                              <div className="space-y-1 col-span-2 md:col-span-4">
                                <Label className="text-purple-200 text-sm">Stream URL *</Label>
                                <Input
                                  value={ep.url}
                                  onChange={(e) => updateEpisode(index, 'url', e.target.value)}
                                  placeholder="https://example.com/s01e01.mp4"
                                  required
                                  className="bg-black/40 border-purple-700/50 text-purple-100"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={addingSeries || !seriesName || episodes.some(ep => !ep.url)}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                  >
                    {addingSeries ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Ekleniyor...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {episodes.length} Bölüm Ekle
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists" className="space-y-4">
            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300">{t('importPlaylist')}</CardTitle>
                <CardDescription className="text-purple-200/70">{t('importPlaylistDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={importPlaylist} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-purple-200">{t('playlistName')}</Label>
                    <Input
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="My Playlist"
                      required
                      className="bg-black/40 border-purple-700/50 text-purple-100"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-purple-200">{t('defaultCategory')}</Label>
                    <Select
                      value={playlistCategory || undefined}
                      onValueChange={(value) => setPlaylistCategory(value || '')}
                    >
                      <SelectTrigger className="bg-black/40 border-purple-700/50">
                        <SelectValue placeholder={t('autoCreate')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t border-purple-700/50 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-purple-200">{t('uploadFile')}</Label>
                        <Input
                          type="file"
                          accept=".m3u,.m3u8"
                          onChange={(e) => {
                            setPlaylistFile(e.target.files[0]);
                            setPlaylistUrl('');
                            setUploadMode('file');
                          }}
                          className="bg-black/40 border-purple-700/50 text-purple-100 file:bg-purple-600 file:text-white file:border-0 file:px-4 file:py-2 file:rounded-md file:mr-4"
                        />
                        {playlistFile && (
                          <p className="text-sm text-purple-300">Seçili: {playlistFile.name}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex-1 border-t border-purple-700/50"></div>
                        <span className="text-sm text-purple-400">{t('or')}</span>
                        <div className="flex-1 border-t border-purple-700/50"></div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-purple-200">{t('playlistURL')}</Label>
                        <Input
                          value={playlistUrl}
                          onChange={(e) => {
                            setPlaylistUrl(e.target.value);
                            setPlaylistFile(null);
                            setUploadMode('url');
                          }}
                          placeholder="https://example.com/playlist.m3u8"
                          disabled={!!playlistFile}
                          className="bg-black/40 border-purple-700/50 text-purple-100 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={uploadingPlaylist || (!playlistUrl && !playlistFile)}
                    className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                  >
                    {uploadingPlaylist ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        {t('importing')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('importPlaylist')}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content" className="space-y-4">
            {/* Delete All Buttons */}
            <Card className="bg-black/60 backdrop-blur-xl border-red-800/50">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  {t('bulkDelete')}
                </CardTitle>
                <CardDescription className="text-red-200/70">{t('bulkDeleteWarning')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="destructive"
                    onClick={deleteAllMovies}
                    disabled={deletingAll === 'movies' || moviesCount === 0}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingAll === 'movies' ? '...' : <Trash2 className="h-4 w-4 mr-2" />}
                    {t('deleteAllMovies')} ({moviesCount})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={deleteAllSeries}
                    disabled={deletingAll === 'series' || seriesCount === 0}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingAll === 'series' ? '...' : <Trash2 className="h-4 w-4 mr-2" />}
                    {t('deleteAllSeries')} ({seriesCount})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={deleteAllChannels}
                    disabled={deletingAll === 'channels' || allChannels.length === 0}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deletingAll === 'channels' ? '...' : <Trash2 className="h-4 w-4 mr-2" />}
                    {t('deleteAllLiveTV')} ({allChannels.length})
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/60 backdrop-blur-xl border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-300">{t('manageContent')}</CardTitle>
                <CardDescription className="text-purple-200/70">{t('manageContentDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                  <Input
                    type="text"
                    placeholder={t('searchContent')}
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    className="pl-10 bg-black/40 border-purple-700/50 text-purple-100"
                  />
                </div>

                {/* Movies & Series */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center">
                    <Film className="h-5 w-5 mr-2" />
                    {t('moviesAndSeries')} ({filteredMedia.length})
                  </h3>
                  <ScrollArea className="h-[300px] border border-purple-700/50 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('title')}</TableHead>
                          <TableHead>{t('mediaType')}</TableHead>
                          <TableHead>{t('category')}</TableHead>
                          <TableHead>{t('added')}</TableHead>
                          <TableHead>{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMedia.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-purple-400 py-8">
                              {t('noMediaFound')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredMedia.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {item.metadata?.poster ? (
                                    <img src={item.metadata.poster} alt={item.title} className="w-8 h-12 object-cover rounded" />
                                  ) : (
                                    <div className="w-8 h-12 bg-purple-900/30 rounded flex items-center justify-center">
                                      <Film className="h-4 w-4 text-purple-400" />
                                    </div>
                                  )}
                                  <span className="text-purple-100">{item.title}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.type === 'MOVIE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {item.type === 'MOVIE' ? t('movie') : t('series')}
                                </span>
                              </TableCell>
                              <TableCell className="text-purple-300">{item.category?.name || '-'}</TableCell>
                              <TableCell className="text-purple-400 text-sm">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-600 text-purple-300 hover:bg-purple-800/50"
                                    onClick={() => openEditModal(item)}
                                  >
                                    Düzenle
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteMedia(item.id)}
                                    disabled={deletingId === item.id}
                                  >
                                    {deletingId === item.id ? '...' : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Live TV Channels */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center">
                    <Radio className="h-5 w-5 mr-2" />
                    {t('liveTV')} ({filteredChannels.length})
                  </h3>
                  <ScrollArea className="h-[300px] border border-purple-700/50 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('channel')}</TableHead>
                          <TableHead>{t('group')}</TableHead>
                          <TableHead>{t('category')}</TableHead>
                          <TableHead>{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChannels.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-purple-400 py-8">
                              {t('noChannelsFound')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredChannels.map((channel) => (
                            <TableRow key={channel.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {channel.logo ? (
                                    <img src={channel.logo} alt={channel.name} className="w-8 h-8 object-contain rounded bg-black/40" />
                                  ) : (
                                    <div className="w-8 h-8 bg-purple-900/30 rounded flex items-center justify-center">
                                      <Radio className="h-4 w-4 text-purple-400" />
                                    </div>
                                  )}
                                  <span className="text-purple-100">{channel.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-purple-300">{channel.groupTitle || '-'}</TableCell>
                              <TableCell className="text-purple-300">{channel.category?.name || '-'}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteChannel(channel.id)}
                                  disabled={deletingId === channel.id}
                                >
                                  {deletingId === channel.id ? '...' : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-black/80 border-purple-600 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-purple-300">İçerik Düzenle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-purple-200">Başlık</Label>
                <Input value={editingItemForm.title} onChange={e => setEditingItemForm({...editingItemForm, title: e.target.value})} className="bg-black/40 border-purple-700/50 text-purple-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-200">Kategori</Label>
                <Select
                  value={editingItemForm.categoryId}
                  onValueChange={(value) => setEditingItemForm({ ...editingItemForm, categoryId: value })}
                >
                  <SelectTrigger className="bg-black/40 border-purple-700/50">
                    <SelectValue placeholder="Kategori Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Yok</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-purple-200">URL / Bağlantı</Label>
                <Input value={editingItemForm.url} onChange={e => setEditingItemForm({...editingItemForm, url: e.target.value})} className="bg-black/40 border-purple-700/50 text-purple-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-200">Poster Görseli URL (İsteğe bağlı)</Label>
                <Input value={editingItemForm.poster} onChange={e => setEditingItemForm({...editingItemForm, poster: e.target.value})} className="bg-black/40 border-purple-700/50 text-purple-100" />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={closeEditModal} className="border-purple-600 text-purple-300 hover:bg-purple-800/50">İptal</Button>
                <Button onClick={saveEdit} disabled={savingEdit} className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900">{savingEdit ? 'Kaydediliyor...' : 'Kaydet'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
