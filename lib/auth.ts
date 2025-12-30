import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { getUserByEmail, verifyPassword, createUser } from '@/lib/models/user';
import { createOrganization, organizationExists } from '@/lib/models/organization';

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // Find user by email
        const user = await getUserByEmail(credentials.email);

        if (!user) {
          throw new Error('No user found with this email');
        }

        // Check if user has a password (not OAuth user)
        if (!user.password) {
          throw new Error('Please sign in with Google');
        }

        // Verify password
        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error('Please verify your email before signing in');
        }

        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          org_id: user.org_id,
          role: user.role,
        };
      },
    }),

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Check if user already exists
          let existingUser = await getUserByEmail(profile.email);

          if (!existingUser) {
            // Create new organization for new user
            const orgName = profile.name || profile.email.split('@')[0];
            const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Check if org exists
            const orgExistsFlag = await organizationExists(orgId);
            
            if (!orgExistsFlag) {
              await createOrganization({
                org_id: orgId,
                name: orgName,
              });
            }

            // Create new user
            existingUser = await createUser({
              name: profile.name || profile.email.split('@')[0],
              email: profile.email,
              provider: 'google',
              org_id: orgId,
              role: 'owner',
              image: (profile as any).picture,
              emailVerified: new Date(), // Auto-verify for Google
            });
          }

          // Update user object with org_id for session
          user.org_id = existingUser.org_id;
          user.role = existingUser.role;
          user.id = existingUser._id!.toString();

          return true;
        } catch (error) {
          console.error('Error during Google sign-in:', error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.org_id = (user as any).org_id;
        token.role = (user as any).role;
      }

      return token;
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).org_id = token.org_id;
        (session.user as any).role = token.role;
      }

      return session;
    },
  },

  pages: {
    signIn: '/signin',
    error: '/signin?error=true',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
};

