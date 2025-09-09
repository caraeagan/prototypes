import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
  },
  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false // Set to false for development
      }
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false // Set to false for development
      }
    }
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect callback:', { url, baseUrl });
      // Redirect to dashboard after successful login
      if (url === baseUrl) return `${baseUrl}/dashboard`
      // Allow relative urls
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allow absolute urls on same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      console.log('NextAuth signIn callback:', { user: user.email, account: account?.provider });
      return true;
    },
  },
  debug: true,
  logger: {
    error(code, metadata) {
      console.error('NextAuth error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth warn:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth debug:', code, metadata)
    }
  },
}