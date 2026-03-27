import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, setSession, clearSession } from '@/lib/auth';
import { searchMedia, getMediaDetails, formatMetadata } from '@/lib/tmdb';
import { fetchM3U, parseM3U } from '@/lib/m3u-parser';
import { jwtVerify } from 'jose';
import formidable from 'formidable';
import { writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { z } from 'zod';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

async function getSessionFromRequest(request) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;
  
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (err) {
    return null;
  }
}

async function handleRoute(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    // ===== AUTH ENDPOINTS =====
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return handleCORS(NextResponse.json({ error: 'Username and password required' }, { status: 400 }));
      }

      const user = await prisma.user.findUnique({ where: { username } });
      
      if (!user || !user.isActive) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      // Check subscription for regular users
      if (user.role === 'user' && user.subscriptionEnd) {
        if (new Date(user.subscriptionEnd) < new Date()) {
          return handleCORS(NextResponse.json({ error: 'Subscription expired' }, { status: 403 }));
        }
      }

      const token = await setSession(user);

      const jsonResponse = handleCORS(NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          subscriptionEnd: user.subscriptionEnd
        }
      }));

      const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
      jsonResponse.headers.append('Set-Cookie', `session=${token}; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`);

      return jsonResponse;
    }

    if (route === '/auth/logout' && method === 'POST') {
      const jsonResponse = handleCORS(NextResponse.json({ success: true }));
      jsonResponse.headers.append('Set-Cookie', `session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`);
      return jsonResponse;
    }

    if (route === '/auth/me' && method === 'GET') {
      const session = await getSessionFromRequest(request);
      if (!session) {
        return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }));
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, role: true, subscriptionEnd: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return handleCORS(NextResponse.json({ error: 'User not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({ user }));
    }

    // ===== OWNER ENDPOINTS =====
    const session = await getSessionFromRequest(request);
    
    // User management
    if (route === '/owner/users' && method === 'GET') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const users = await prisma.user.findMany({
        where: { role: 'user' },
        select: { id: true, username: true, isActive: true, subscriptionEnd: true, createdAt: true }
      });

      return handleCORS(NextResponse.json({ users }));
    }

    if (route === '/owner/users' && method === 'POST') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const body = await request.json();
      const { username, password, subscriptionEnd } = body;

      if (!username || !password) {
        return handleCORS(NextResponse.json({ error: 'Username and password required' }, { status: 400 }));
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'user',
          subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : null
        },
        select: { id: true, username: true, subscriptionEnd: true, createdAt: true }
      });

      return handleCORS(NextResponse.json({ user }));
    }

    if (route.startsWith('/owner/users/') && method === 'PUT') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const userId = route.split('/').pop();
      const body = await request.json();
      const { isActive, password, subscriptionEnd } = body;

      const updateData = {};
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (password) updateData.password = await hashPassword(password);
      if (subscriptionEnd !== undefined) {
        updateData.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, username: true, isActive: true, subscriptionEnd: true }
      });

      return handleCORS(NextResponse.json({ user }));
    }

    // Category management
    if (route === '/owner/categories' && method === 'GET') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const categories = await prisma.category.findMany();
      return handleCORS(NextResponse.json({ categories }));
    }

    if (route === '/owner/categories' && method === 'POST') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const body = await request.json();
      const { name, slug, description, type } = body;

      const category = await prisma.category.create({
        data: { 
          name, 
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'), 
          description,
          type: type || 'all'
        }
      });

      return handleCORS(NextResponse.json({ category }));
    }

    if (route.startsWith('/owner/categories/') && method === 'DELETE') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const categoryId = route.split('/').pop();
      await prisma.category.delete({ where: { id: categoryId } });

      return handleCORS(NextResponse.json({ success: true }));
    }

    // TMDB search
    if (route === '/owner/tmdb/search' && method === 'GET') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const url = new URL(request.url);
      const query = url.searchParams.get('q');
      const type = url.searchParams.get('type') || 'multi';

      if (!query) {
        return handleCORS(NextResponse.json({ error: 'Query required' }, { status: 400 }));
      }

      const results = await searchMedia(query, type);
      return handleCORS(NextResponse.json({ results }));
    }

    if (route === '/owner/tmdb/details' && method === 'GET') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      const type = url.searchParams.get('type') || 'movie';

      if (!id) {
        return handleCORS(NextResponse.json({ error: 'ID required' }, { status: 400 }));
      }

      const details = await getMediaDetails(id, type);
      if (!details) {
        return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
      }

      const metadata = formatMetadata(details, type);
      return handleCORS(NextResponse.json({ metadata }));
    }

    // Media management
    if (route === '/owner/media/add-link' && method === 'POST') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const body = await request.json();
      const { title, url, type, categoryId, metadata, season, episode, seriesName } = body;

      let seriesId = null;
      if (type === 'EPISODE' && seriesName) {
        let series = await prisma.mediaItem.findFirst({
          where: { title: seriesName, type: 'SERIES' }
        });
        if (!series) {
          series = await prisma.mediaItem.create({
            data: {
              title: seriesName,
              type: 'SERIES',
              url: '',
              categoryId: categoryId || null
            }
          });
          if (metadata) {
            await prisma.movieMetadata.create({
              data: {
                mediaItemId: series.id,
                ...metadata
              }
            });
          }
        }
        seriesId = series.id;
      }

      const mediaItem = await prisma.mediaItem.create({
        data: {
          title,
          url: url || '',
          type: type || 'MOVIE',
          categoryId: categoryId || null,
          season: season ? parseInt(season, 10) : null,
          episode: episode ? parseInt(episode, 10) : null,
          seriesId: seriesId
        }
      });

      if (metadata && type !== 'EPISODE') {
        await prisma.movieMetadata.create({
          data: {
            mediaItemId: mediaItem.id,
            ...metadata
          }
        });
      }

      return handleCORS(NextResponse.json({ mediaItem }));
    }

    // Playlist import from URL
    if (route === '/owner/playlists/import-url' && method === 'POST') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const body = await request.json();
      const { url, name, categoryId } = body;

      const channels = await fetchM3U(url);

      const playlist = await prisma.playlist.create({
        data: {
          name: name || 'Imported Playlist',
          source: url,
          type: 'm3u8'
        }
      });

      // Group channels by groupTitle and auto-create categories or assign to provided category
      for (const channelData of channels) {
        let assignedCategoryId = categoryId;
        
        if (!assignedCategoryId && channelData.groupTitle) {
          let category = await prisma.category.findFirst({
            where: { name: channelData.groupTitle }
          });
          
          if (!category) {
            category = await prisma.category.create({
              data: {
                name: channelData.groupTitle,
                slug: channelData.groupTitle.toLowerCase().replace(/\s+/g, '-')
              }
            });
          }
          
          assignedCategoryId = category.id;
        }

        await prisma.channel.create({
          data: {
            name: channelData.name,
            url: channelData.url,
            logo: channelData.logo,
            groupTitle: channelData.groupTitle,
            playlistId: playlist.id,
            categoryId: assignedCategoryId
          }
        });
      }

      return handleCORS(NextResponse.json({ 
        playlist, 
        channelsCount: channels.length 
      }));
    }

    // Playlist/Media file upload
    if (route === '/owner/upload' && method === 'POST') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const fileType = formData.get('type'); // 'playlist' or 'media'
        const categoryId = formData.get('categoryId');
        const title = formData.get('title');
        
        if (!file) {
          return handleCORS(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
        }

        // Create uploads directory if it doesn't exist
        const { mkdir } = await import('fs/promises');
        const { existsSync } = await import('fs');
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const fileExtension = extname(file.name);
        const fileName = file.name.replace(fileExtension, '');
        const uniqueFileName = `${Date.now()}_${fileName}${fileExtension}`;
        const filePath = join(uploadsDir, uniqueFileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const publicUrl = `/uploads/${uniqueFileName}`;

        // Handle M3U/M3U8 playlist files
        if (fileType === 'playlist' && (fileExtension === '.m3u' || fileExtension === '.m3u8')) {
          const content = buffer.toString('utf-8');
          const channels = parseM3U(content);

          const playlist = await prisma.playlist.create({
            data: {
              name: title || fileName,
              source: publicUrl,
              type: fileExtension.substring(1)
            }
          });

          for (const channelData of channels) {
            let assignedCategoryId = categoryId || null;
            
            if (!assignedCategoryId && channelData.groupTitle) {
              let category = await prisma.category.findFirst({
                where: { name: channelData.groupTitle }
              });
              
              if (!category) {
                category = await prisma.category.create({
                  data: {
                    name: channelData.groupTitle,
                    slug: channelData.groupTitle.toLowerCase().replace(/\\s+/g, '-')
                  }
                });
              }
              
              assignedCategoryId = category.id;
            }

            await prisma.channel.create({
              data: {
                name: channelData.name,
                url: channelData.url,
                logo: channelData.logo,
                groupTitle: channelData.groupTitle,
                playlistId: playlist.id,
                categoryId: assignedCategoryId
              }
            });
          }

          return handleCORS(NextResponse.json({ 
            success: true,
            playlist,
            channelsCount: channels.length 
          }));
        }

        // Handle MP4/video files
        if (fileType === 'media' && (fileExtension === '.mp4' || fileExtension === '.mkv' || fileExtension === '.m3u8')) {
          const mediaTitle = title || fileName;
          
          // Try to fetch TMDB metadata if title provided
          let metadata = null;
          if (title) {
            const tmdbResults = await searchMedia(title, 'movie');
            if (tmdbResults.length > 0) {
              const details = await getMediaDetails(tmdbResults[0].id, 'movie');
              if (details) {
                metadata = formatMetadata(details, 'movie');
              }
            }
          }

          const mediaItem = await prisma.mediaItem.create({
            data: {
              title: mediaTitle,
              url: publicUrl,
              type: 'MOVIE',
              categoryId: categoryId || null
            }
          });

          if (metadata) {
            await prisma.movieMetadata.create({
              data: {
                mediaItemId: mediaItem.id,
                ...metadata
              }
            });
          }

          return handleCORS(NextResponse.json({ 
            success: true,
            mediaItem 
          }));
        }

        return handleCORS(NextResponse.json({ 
          success: true,
          url: publicUrl,
          filename: file.name 
        }));

      } catch (error) {
        console.error('Upload error:', error);
        return handleCORS(NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 }));
      }
    }

    // Delete all media by type
    if (route === '/owner/media/delete-all' && method === 'DELETE') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const url = new URL(request.url);
      const mediaType = url.searchParams.get('type');

      // First delete associated metadata
      const mediaToDelete = await prisma.mediaItem.findMany({
        where: mediaType ? { type: mediaType } : {},
        select: { id: true }
      });

      const mediaIds = mediaToDelete.map(m => m.id);
      
      // Delete metadata first
      await prisma.movieMetadata.deleteMany({
        where: { mediaItemId: { in: mediaIds } }
      });

      // Then delete media items
      const result = await prisma.mediaItem.deleteMany({
        where: mediaType ? { type: mediaType } : {}
      });

      return handleCORS(NextResponse.json({ success: true, count: result.count }));
    }

    // Delete all channels
    if (route === '/owner/channels/delete-all' && method === 'DELETE') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const result = await prisma.channel.deleteMany({});

      return handleCORS(NextResponse.json({ success: true, count: result.count }));
    }

    if (route.startsWith('/owner/media/') && method === 'PUT') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const mediaId = route.split('/').pop();
      const body = await request.json();
      const { title, url, categoryId, metadata } = body;

      const mediaItem = await prisma.mediaItem.update({
        where: { id: mediaId },
        data: {
          title,
          url,
          categoryId: categoryId || null
        }
      });

      if (metadata) {
        const existingMeta = await prisma.movieMetadata.findUnique({ where: { mediaItemId: mediaId } });
        if (existingMeta) {
          await prisma.movieMetadata.update({
            where: { mediaItemId: mediaId },
            data: metadata
          });
        } else {
          await prisma.movieMetadata.create({
            data: { mediaItemId: mediaId, ...metadata }
          });
        }
      }

      return handleCORS(NextResponse.json({ success: true, mediaItem }));
    }

    if (route.startsWith('/owner/media/') && method === 'DELETE') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const mediaId = route.split('/').pop();
      
      // Delete metadata first if exists
      await prisma.movieMetadata.deleteMany({ where: { mediaItemId: mediaId } });
      await prisma.mediaItem.delete({ where: { id: mediaId } });

      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route.startsWith('/owner/channels/') && method === 'DELETE') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const channelId = route.split('/').pop();
      await prisma.channel.delete({ where: { id: channelId } });

      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route === '/owner/media' && method === 'GET') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const media = await prisma.mediaItem.findMany({
        include: {
          metadata: true,
          category: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return handleCORS(NextResponse.json({ media }));
    }

    if (route === '/owner/channels' && method === 'GET') {
      if (!session || session.role !== 'owner') {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
      }

      const channels = await prisma.channel.findMany({
        include: {
          category: true,
          playlist: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return handleCORS(NextResponse.json({ channels }));
    }

    // ===== PUBLIC ENDPOINTS =====
    if (route === '/categories' && method === 'GET') {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { mediaItems: true, channels: true }
          }
        }
      });
      return handleCORS(NextResponse.json({ categories }));
    }

    if (route === '/media' && method === 'GET') {
      const url = new URL(request.url);
      const categoryId = url.searchParams.get('categoryId');
      const type = url.searchParams.get('type');

      const where = {};
      if (categoryId) where.categoryId = categoryId;
      if (type) where.type = type;

      const media = await prisma.mediaItem.findMany({
        where,
        include: {
          metadata: true,
          category: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return handleCORS(NextResponse.json({ media }));
    }

    if (route === '/channels' && method === 'GET') {
      const url = new URL(request.url);
      const categoryId = url.searchParams.get('categoryId');

      const where = categoryId ? { categoryId } : {};

      const channels = await prisma.channel.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' }
      });

      return handleCORS(NextResponse.json({ channels }));
    }

    if (route.startsWith('/media/') && method === 'GET') {
      const mediaId = route.split('/').pop();

      const mediaItem = await prisma.mediaItem.findUnique({
        where: { id: mediaId },
        include: {
          metadata: true,
          category: true,
          episodes: {
            orderBy: [
              { season: 'asc' },
              { episode: 'asc' }
            ]
          },
          series: {
            include: {
              episodes: {
                orderBy: [
                  { season: 'asc' },
                  { episode: 'asc' }
                ]
              }
            }
          }
        }
      });

      if (!mediaItem) {
        return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({ media: mediaItem }));
    }

    if (route.startsWith('/channels/') && method === 'GET') {
      const channelId = route.split('/').pop();

      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { category: true }
      });

      if (!channel) {
        return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({ channel }));
    }

    // Watch progress
    if (route === '/progress' && method === 'POST') {
      if (!session) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { mediaItemId, progress, completed } = body;

      const progressRecord = await prisma.watchProgress.upsert({
        where: {
          userId_mediaItemId: {
            userId: session.userId,
            mediaItemId
          }
        },
        update: {
          progress,
          completed: completed || false,
          lastWatched: new Date()
        },
        create: {
          userId: session.userId,
          mediaItemId,
          progress,
          completed: completed || false
        }
      });

      return handleCORS(NextResponse.json({ progress: progressRecord }));
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }));

  } catch (error) {
    console.error('API Error:', error);
    return handleCORS(NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 }));
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
