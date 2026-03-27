# JellyTV - Modern Media Streaming Platform

JellyTV is a comprehensive media management and streaming platform built with Next.js, Prisma (SQLite), and TMDB integration. It supports movies, TV episodes, and live TV channels with M3U/M3U8 playlist import.

## 🎯 Features

### Owner Dashboard
- **User Management**: Create, manage, and disable user accounts
- **Subscription Management**: Set subscription expiry dates for users
- **Category Management**: Create and organize content categories
- **Media Management**: Add movies and TV shows with automatic TMDB metadata fetching
- **Playlist Import**: Import M3U/M3U8 playlists with automatic channel parsing
- **Live TV Support**: Manage live TV channels with HLS streaming

### User Features
- **Content Browsing**: Browse movies, episodes, and live channels by category
- **Video Player**: Built-in HLS.js-powered player for streaming
- **Watch Progress**: Automatic progress tracking for movies and episodes
- **Subscription Control**: Automatic access blocking when subscription expires
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

### Technical Features
- **Authentication**: Secure JWT-based session management with httpOnly cookies
- **Route Protection**: Middleware-based access control
- **TMDB Integration**: Automatic metadata fetching (posters, descriptions, ratings)
- **HLS Streaming**: Support for .m3u8 live streams and VOD
- **SQLite Database**: Lightweight Prisma ORM with SQLite
- **Modern UI**: shadcn/ui components with Tailwind CSS

## 🚀 Getting Started

### Default Credentials



### Prerequisites
- Node.js 18+
- Yarn package manager

### Installation

The application is already set up and running. Access it at:
- Local: http://localhost:3000
- Production: https://stream-portal-87.preview.emergentagent.com

### Project Structure

```
/app
├── app/
│   ├── api/[[...path]]/route.js   # API endpoints
│   ├── page.js                     # Home page (media browsing)
│   ├── login/page.js               # Login page
│   ├── owner/page.js               # Owner dashboard
│   ├── watch/[id]/page.js          # Video player page
│   ├── layout.js                   # Root layout with Toaster
│   └── globals.css                 # Global styles
├── lib/
│   ├── prisma.js                   # Prisma client
│   ├── auth.js                     # Authentication utilities
│   ├── tmdb.js                     # TMDB API integration
│   └── m3u-parser.js               # M3U playlist parser
├── components/ui/                  # shadcn/ui components
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.js                     # Database seeding
├── middleware.js                   # Route protection
├── .env                            # Environment variables
└── package.json                    # Dependencies
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user session

### Owner Endpoints (Owner Only)
- `GET /api/owner/users` - List all users
- `POST /api/owner/users` - Create new user
- `PUT /api/owner/users/:id` - Update user (status, password, subscription)
- `GET /api/owner/categories` - List categories
- `POST /api/owner/categories` - Create category
- `DELETE /api/owner/categories/:id` - Delete category
- `GET /api/owner/tmdb/search` - Search TMDB
- `GET /api/owner/tmdb/details` - Get TMDB details
- `POST /api/owner/media/add-link` - Add media with stream URL
- `POST /api/owner/playlists/import-url` - Import M3U playlist

### Public Endpoints
- `GET /api/categories` - Get all categories
- `GET /api/media` - Get all media items (with filtering)
- `GET /api/media/:id` - Get media by ID
- `GET /api/channels` - Get all channels (with filtering)
- `GET /api/channels/:id` - Get channel by ID
- `POST /api/progress` - Save watch progress (authenticated)

## 🗄️ Database Schema

### Models
- **User**: User accounts with roles (owner/user) and subscription management
- **Category**: Content categories
- **MediaItem**: Movies, episodes, and channels
- **MovieMetadata**: TMDB metadata (posters, descriptions, ratings)
- **Playlist**: M3U playlist information
- **Channel**: Live TV channels
- **WatchProgress**: User watch history and progress

## 🎨 UI Components

Built with shadcn/ui:
- Card, Button, Input, Label
- Tabs, Table, Dialog, Select
- Toast notifications (sonner)
- All components styled with Tailwind CSS

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure session tokens in httpOnly cookies
- **Route Protection**: Middleware-based authentication
- **Role-Based Access**: Owner vs User permissions
- **Subscription Checks**: Automatic access control

## 🎬 TMDB Integration

The platform automatically fetches metadata from TMDB:
- Movie/TV show search
- Posters and backdrop images
- Descriptions and overviews
- Release years and ratings
- Genre information
- Runtime details
- IMDb IDs

### Environment Variables Required
- `TMDB_API_KEY`: Already configured in .env

## 📺 Streaming Support

### Supported Formats
- **HLS**: .m3u8 streams (live TV and VOD)
- **MP4/MKV**: Direct video files
- **M3U Playlists**: Automatic parsing and channel import

### Player Features
- HLS.js for adaptive streaming
- Native Safari HLS support
- Watch progress tracking
- Metadata display panel
- Mobile-responsive controls

## 👥 User Management

### Owner Capabilities
1. Create user accounts with custom credentials
2. Set subscription expiry dates
3. Enable/disable user accounts
4. Update subscription dates anytime
5. Reset user passwords

### Subscription System
- Users can have optional subscription end dates
- Automatic access blocking when expired
- Owner has unlimited access (no subscription)
- Clear expiry notifications

## 📦 Dependencies

### Core
- Next.js 14.2.3
- React 18
- Prisma 5.22.0 (SQLite)
- bcryptjs 2.4.3
- jose 5.9.6 (JWT)

### UI
- shadcn/ui components
- Tailwind CSS 3.4.1
- lucide-react (icons)
- sonner (toasts)

### Streaming
- hls.js 1.5.18

### Utilities
- axios 1.10.0
- formidable 3.5.2
- zod 3.25.67

## 🔧 Configuration

### Environment Variables (.env)
```env
DATABASE_URL=file:./dev.db
TMDB_API_KEY=fb7bb23f03b6994dafc674c074d01761
JWT_SECRET=jellytv_super_secret_key_change_in_production_12345
NEXT_PUBLIC_BASE_URL=https://stream-portal-87.preview.emergentagent.com
CORS_ORIGINS=*
```

## 🧪 Testing

All backend endpoints have been tested and verified:
- ✅ Authentication flow (login/logout/session)
- ✅ User management (CRUD operations)
- ✅ Category management
- ✅ TMDB integration
- ✅ Media management
- ✅ Playlist import
- ✅ Public data access
- ✅ Session management with cookies

## 🎯 Usage Guide

### For Owners

1. **Login**: Use credentials (ryan/115457)
2. **Dashboard**: Navigate to /owner
3. **Create Users**:
   - Set username and password
   - Optionally set subscription end date
4. **Manage Categories**:
   - Create categories for organizing content
5. **Add Media**:
   - Search TMDB for metadata
   - Add stream URL
   - Select category
6. **Import Playlists**:
   - Provide M3U/M3U8 URL
   - Channels automatically parsed
   - Categories auto-created from group-title

### For Users

1. **Login**: Use credentials provided by owner
2. **Browse**: View movies, episodes, and channels by category
3. **Watch**: Click any content to start streaming
4. **Progress**: Your watch progress is automatically saved

## 🔮 Future Enhancements

Potential additions:
- File upload support for local media
- Advanced search and filtering
- Watchlists and favorites
- Multi-language support
- Recommendation engine
- Mobile apps
- Chromecast/AirPlay support

## 📝 Notes

- Database seeded with owner account and default categories
- TMDB API key configured and working
- All authentication uses secure httpOnly cookies
- Subscription expiry automatically blocks access
- HLS streaming works across all modern browsers

## 🎉 Ready to Use

JellyTV is fully operational and ready for use. Login with the owner account to start managing users and content!
