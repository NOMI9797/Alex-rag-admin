/**
 * Qdrant client wrapper for knowledge base management
 */

import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantConfig {
  url: string;
  apiKey: string;
  collectionName: string;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    text: string;
    [key: string]: any;
  };
}

export interface SearchResult {
  id: string;
  text: string;
  distance: number;
  metadata: Record<string, any>;
}

export interface CollectionStats {
  collection_name: string;
  vector_count: number;
  vector_size: number;
  distance_metric: string;
  status: string;
}

export class QdrantManager {
  private client: QdrantClient;
  private collectionName: string;

  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.collectionName = config.collectionName;
  }

  /**
   * Upload vectors to Qdrant collection
   */
  async uploadVectors(
    vectors: number[][],
    texts: string[],
    metadata?: Record<string, any>[]
  ): Promise<boolean> {
    try {
      const points = vectors.map((vector, index) => ({
        id: crypto.randomUUID(),
        vector,
        payload: {
          text: texts[index],
          ...(metadata?.[index] || {}),
        },
      }));

      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      });

      return true;
    } catch (error) {
      console.error('Error uploading vectors:', error);
      return false;
    }
  }

  /**
   * Delete all vectors from collection
   */
  async deleteAll(): Promise<boolean> {
    try {
      // Delete collection
      await this.client.deleteCollection(this.collectionName);
      
      // Recreate empty collection
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      return false;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<CollectionStats | null> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      
      // Handle both named and unnamed vector configs
      const vectorsConfig = info.config?.params?.vectors;
      let vectorSize = 1536;
      let distanceMetric = 'Cosine';
      
      if (vectorsConfig) {
        if (typeof vectorsConfig === 'object' && 'size' in vectorsConfig && typeof vectorsConfig.size === 'number') {
          // Named vectors config
          vectorSize = vectorsConfig.size;
          distanceMetric = (vectorsConfig.distance as string) || 'Cosine';
        } else if (typeof vectorsConfig === 'number') {
          // Simple size number
          vectorSize = vectorsConfig;
        }
      }
      
      return {
        collection_name: this.collectionName,
        vector_count: info.points_count || 0,
        vector_size: vectorSize,
        distance_metric: distanceMetric,
        status: info.status || 'unknown',
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Get all texts from collection
   */
  async getAllTexts(limit: number = 1000): Promise<Array<{ text: string; metadata: Record<string, any> }>> {
    try {
      const results: Array<{ text: string; metadata: Record<string, any> }> = [];
      let offset: string | number | undefined = undefined;

      while (results.length < limit) {
        const response = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset,
          with_payload: true,
          with_vector: false,
        });

        if (!response.points || response.points.length === 0) {
          break;
        }

        for (const point of response.points) {
          const payload = point.payload as any;
          const text = payload?.text || '';
          const { text: _, ...metadata } = payload || {};
          
          results.push({ text, metadata });

          if (results.length >= limit) {
            break;
          }
        }

        if (!response.next_page_offset) {
          break;
        }

        // Type guard for offset
        const nextOffset = response.next_page_offset;
        if (typeof nextOffset === 'string' || typeof nextOffset === 'number') {
          offset = nextOffset;
        } else {
          break;
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting texts:', error);
      return [];
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(): Promise<boolean> {
    try {
      await this.client.getCollection(this.collectionName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure collection exists, create if it doesn't
   */
  async ensureCollection(): Promise<boolean> {
    try {
      const exists = await this.collectionExists();
      
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Error ensuring collection:', error);
      return false;
    }
  }
}

/**
 * Create Qdrant manager from environment variables
 */
export function createQdrantManager(): QdrantManager {
  const config: QdrantConfig = {
    url: process.env.QDRANT_URL || '',
    apiKey: process.env.QDRANT_API_KEY || '',
    collectionName: process.env.QDRANT_COLLECTION_NAME || 'knowledge_base',
  };

  if (!config.url || !config.apiKey) {
    throw new Error('QDRANT_URL and QDRANT_API_KEY must be set in environment variables');
  }

  return new QdrantManager(config);
}

