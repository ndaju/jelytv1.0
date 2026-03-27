import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookie
  const token = request.cookies.get('session')?.value;
  
  let session = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      session = verified.payload;
    } catch (err) {
      // Invalid token
    }
  }
  
  // Allow access to login page without authentication
  if (pathname === '/login') {
    // If already logged in, redirect to appropriate page
    if (session) {
      if (session.role === 'owner') {
        return NextResponse.redirect(new URL('/owner', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  
  // Protect all other routes - require authentication
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Protect /owner routes - only for owner role
  if (pathname.startsWith('/owner')) {
    if (session.role !== 'owner') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/owner/:path*',
    '/login',
    '/watch/:path*'
  ]
};
