import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated
        if (!token) {
          return false;
        }

        // Allow access to authenticated users
        return true;
      },
    },
    pages: {
      signIn: '/signin',
    },
  }
);

// Protect all routes except auth pages and public API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /signin, /signup, /forgot-password, /reset-password, /verify-email (auth pages)
     * - /api/auth/* (auth API routes)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico, /sitemap.xml, /robots.txt (metadata files)
     */
    '/((?!signin|signup|forgot-password|reset-password|verify-email|api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

