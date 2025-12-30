import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string; // Hashed password (optional for OAuth users)
  emailVerified?: Date | null;
  image?: string;
  provider?: 'credentials' | 'google'; // Auth provider
  org_id: string; // Link to organization
  role: 'owner' | 'admin' | 'member'; // User role in organization
  created_at: Date;
  updated_at: Date;
}

export interface VerificationToken {
  _id?: ObjectId;
  identifier: string; // Email address
  token: string; // Unique token
  expires: Date;
  type: 'email_verification' | 'password_reset';
  created_at: Date;
}

const USERS_COLLECTION = 'users';
const VERIFICATION_TOKENS_COLLECTION = 'verification_tokens';

// User CRUD operations
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ 
    email: email.toLowerCase() 
  });
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ 
    _id: new ObjectId(id) 
  });
  return user;
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  provider?: 'credentials' | 'google';
  org_id: string;
  role?: 'owner' | 'admin' | 'member';
  image?: string;
  emailVerified?: Date;
}): Promise<User> {
  const db = await getDatabase();

  // Hash password if provided
  let hashedPassword: string | undefined;
  if (data.password) {
    hashedPassword = await bcrypt.hash(data.password, 12);
  }

  const user: User = {
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    provider: data.provider || 'credentials',
    org_id: data.org_id,
    role: data.role || 'owner',
    image: data.image,
    emailVerified: data.emailVerified || null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await db.collection<User>(USERS_COLLECTION).insertOne(user);

  return {
    ...user,
    _id: result.insertedId,
  };
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<User>(USERS_COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updated_at: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const db = await getDatabase();
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const result = await db.collection<User>(USERS_COLLECTION).updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        password: hashedPassword,
        updated_at: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

// Verification Token operations
export async function createVerificationToken(
  email: string,
  type: 'email_verification' | 'password_reset'
): Promise<VerificationToken> {
  const db = await getDatabase();

  // Delete any existing tokens for this email and type
  await db.collection<VerificationToken>(VERIFICATION_TOKENS_COLLECTION).deleteMany({
    identifier: email.toLowerCase(),
    type,
  });

  // Generate secure token
  const token = generateSecureToken();

  const verificationToken: VerificationToken = {
    identifier: email.toLowerCase(),
    token,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    type,
    created_at: new Date(),
  };

  const result = await db
    .collection<VerificationToken>(VERIFICATION_TOKENS_COLLECTION)
    .insertOne(verificationToken);

  return {
    ...verificationToken,
    _id: result.insertedId,
  };
}

export async function verifyToken(
  token: string,
  type: 'email_verification' | 'password_reset'
): Promise<{ valid: boolean; email?: string }> {
  const db = await getDatabase();

  const verificationToken = await db
    .collection<VerificationToken>(VERIFICATION_TOKENS_COLLECTION)
    .findOne({
      token,
      type,
    });

  if (!verificationToken) {
    return { valid: false };
  }

  // Check if token is expired
  if (verificationToken.expires < new Date()) {
    // Delete expired token
    await db.collection<VerificationToken>(VERIFICATION_TOKENS_COLLECTION).deleteOne({
      _id: verificationToken._id,
    });
    return { valid: false };
  }

  return {
    valid: true,
    email: verificationToken.identifier,
  };
}

export async function deleteVerificationToken(token: string): Promise<boolean> {
  const db = await getDatabase();

  const result = await db
    .collection<VerificationToken>(VERIFICATION_TOKENS_COLLECTION)
    .deleteOne({ token });

  return result.deletedCount > 0;
}

// Helper function to generate secure token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < array.length; i++) {
    token += chars[array[i] % chars.length];
  }
  
  return token;
}

// Get users by organization
export async function getUsersByOrg(org_id: string): Promise<User[]> {
  const db = await getDatabase();
  const users = await db
    .collection<User>(USERS_COLLECTION)
    .find({ org_id })
    .toArray();
  return users;
}


