import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyInterviewSession } from "@/lib/auth/interview-session";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/api/interview-questions",
  "/api/coding-questions",
  "/api/generate-feedback",
  "/api/complete-interview",
  "/api/interviews/send-email", // Updated: moved to interviews directory
  "/api/interview-analytics",
  "/api/content/questions",
  "/api/content/questions/banks", // Updated: consolidated question banks
];

// Routes that require super-admin role
const superAdminRoutes = [
  "/admin",
  "/api/admin",
];

// Routes that require company or super-admin role
const adminRoutes = [
  "/dashboard/unified-analytics",
  "/dashboard/users",
  "/dashboard/settings",
];

// Company dashboard routes that candidates should not access
const companyOnlyRoutes = [
  "/dashboard",
  "/admin",
];

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/terms",
  "/privacy",
  "/auth/signin",
  "/auth/signup",
  "/api/auth",
  "/api/contact",
  "/interview/verify",
  "/interview/otp",
  "/interview/details",
  "/interview/photo",
  "/api/interview/verify-email",
  "/api/interview/verify-otp",
  "/api/interview/resend-otp",
  "/api/public",
  "/jobs",
];

// Interview routes that use candidate access tokens (old system)
const candidateInterviewRoutes = [
  "/candidate/interview"
];

// Candidate dashboard routes that require candidate authentication
const candidateProtectedRoutes = [
  "/candidate"
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for protected interview routes that require OTP verification
  if (pathname.startsWith('/interview/lobby') || 
      pathname.startsWith('/interview/types') || 
      pathname.startsWith('/interview/complete') ||
      pathname.startsWith('/api/interview/')) {
    
    // Skip verification for the verification APIs themselves
    if (pathname.includes('/verify-email') || 
        pathname.includes('/verify-otp') || 
        pathname.includes('/resend-otp')) {
      return NextResponse.next();
    }
    
    const session = verifyInterviewSession(request);
    if (!session) {
      // Redirect to verification page
      return NextResponse.redirect(new URL('/interview/verify', request.url));
    }
    
    return NextResponse.next();
  }
  
  // Allow other public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle candidate interview access - now email-based only
  if (candidateInterviewRoutes.some(route => pathname.startsWith(route))) {
    return await handleCandidateEmailAccess(request);
  }

  // Handle candidate dashboard access
  if (candidateProtectedRoutes.some(route => pathname.startsWith(route))) {
    return await handleCandidateDashboardAccess(request);
  }

  // Check for session cookies (database sessions are validated by NextAuth adapter)
  const sessionToken = request.cookies.get('nextauth.session-token') || 
                      request.cookies.get('__Secure-nextauth.session-token');

  // Redirect to signin if no session and route is protected
  if (!sessionToken && protectedRoutes.some(route => pathname.startsWith(route))) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If user has a session token, allow access but let components handle detailed auth
  if (sessionToken) {
    // For protected routes, we'll let the actual components/API routes handle 
    // detailed authentication and role checking using the full auth() function
    // This avoids expensive database/Redis calls in middleware while maintaining security
    
    // Basic redirects for authenticated users on home page
    if (pathname === "/") {
      // Default redirect to dashboard - components will handle role-specific redirects
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Let the request proceed - detailed auth will be handled by components
    return NextResponse.next();
  }

  return NextResponse.next();
}

async function handleCandidateEmailAccess(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  
  // All candidate interview access is now email-based only
  // No authentication required - just email verification via OTP
  const email = searchParams.get('email');
  
  if (!email) {
    return NextResponse.redirect(new URL('/interview/verify', request.url));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.redirect(new URL('/interview/verify', request.url));
  }

  // Add candidate info to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-candidate-email', email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

async function handleCandidateDashboardAccess(request: NextRequest) {
  // Candidate dashboard access is now email-based only
  // Redirect to interview verification if trying to access candidate routes
  return NextResponse.redirect(new URL('/interview/verify', request.url));
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
