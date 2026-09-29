import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest} from 'next/server'

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    // Static assets are served straight from /public and /_next. Running
    // updateSession on them costs a full supabase.auth.getUser() round-trip per
    // file, which is why the 4 MB icon font was the slowest request in the HAR.
    // Fonts matter most here: they are on the critical rendering path.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf|eot|css|js|mjs|map|webmanifest|txt|xml|mp4|webm|mp3|wav|pdf)$).*)',
  ],
}
