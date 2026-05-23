/**
 * MongoDB connection and client management
 */

import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  // Connection timeout and retry options
  serverSelectionTimeoutMS: 10000, // 10 seconds to find a server
  socketTimeoutMS: 45000, // 45 seconds for socket operations
  connectTimeoutMS: 10000, // 10 seconds to establish connection
  retryWrites: true,
  retryReads: true,
  // Handle DNS resolution issues
  directConnection: false, // Use SRV records (mongodb+srv)
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    // Wrap connection promise with error handling to prevent unhandled rejections
    globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
      // Suppress transient DNS errors in development (they auto-retry)
      if (error.code !== 'ESERVFAIL') {
        console.error('MongoDB connection failed during initialization:', error);
      }
      // Re-throw to allow retry on next access
      throw error;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  // Wrap connection promise with error handling
  clientPromise = client.connect().catch((error) => {
    // Suppress transient DNS errors (they auto-retry)
    if (error.code !== 'ESERVFAIL') {
      console.error('MongoDB connection failed during initialization:', error);
    }
    throw error;
  });
}

/**
 * Get MongoDB client with error handling
 */
export async function getMongoClient(): Promise<MongoClient> {
  try {
    const client = await clientPromise;
    
    // Check if client is still connected
    if (!client) {
      throw new Error('MongoDB client is not initialized');
    }
    
    return client;
  } catch (error: any) {
    // Suppress transient DNS errors in logs
    if (error.code !== 'ESERVFAIL') {
      console.error('MongoDB connection error:', error);
    }
    throw error;
  }
}

/**
 * Get database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB_NAME || 'alex_rag_admin');
}

export default clientPromise;

