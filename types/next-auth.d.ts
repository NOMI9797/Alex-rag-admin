import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface User extends DefaultUser {
    org_id?: string;
    role?: string;
  }

  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      org_id?: string;
      role?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    org_id?: string;
    role?: string;
  }
}
