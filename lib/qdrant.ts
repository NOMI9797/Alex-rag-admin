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
   * Delete all knowledge base vectors from collection (preserve config items like instructions)
   */
  async deleteAll(): Promise<boolean> {
    try {
      const pointsToDelete: string[] = [];
      let offset: string | number | undefined = undefined;

      // Scroll through all points and collect IDs of non-config points
      while (true) {
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
          // Only delete if it's NOT a config item (config items have type: 'config')
          if (payload?.type !== 'config') {
            pointsToDelete.push(point.id as string);
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

      // Delete all non-config points in batches
      if (pointsToDelete.length > 0) {
        // Qdrant REST API delete expects points in the body
        await this.client.delete(this.collectionName, {
          points: pointsToDelete,
        });
      }

      return true;
    } catch (error) {
      console.error('Error deleting knowledge base vectors:', error);
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

  /**
   * Delete the entire collection from Qdrant
   */
  async deleteCollection(): Promise<boolean> {
    try {
      const exists = await this.collectionExists();
      
      if (exists) {
        await this.client.deleteCollection(this.collectionName);
        console.log(`Successfully deleted collection: ${this.collectionName}`);
        return true;
      }
      
      console.log(`Collection does not exist: ${this.collectionName}`);
      return true; // Return true if collection doesn't exist (already deleted)
    } catch (error) {
      console.error(`Error deleting collection '${this.collectionName}':`, error);
      return false;
    }
  }

  /**
   * Store configuration data in Qdrant using scroll to find and update
   */
  async uploadConfig(configKey: string, configValue: string): Promise<boolean> {
    try {
      // First, try to delete existing config if it exists
      await this.deleteConfig(configKey);

      // Create a zero vector for config (not used for search)
      const zeroVector = new Array(1536).fill(0);
      
      // Use a UUID for the point ID to avoid any string ID issues
      const pointId = crypto.randomUUID();
      const point = {
        id: pointId,
        vector: zeroVector,
        payload: {
          type: 'config',
          config_key: configKey,
          config_value: configValue,
          text: '', // Empty text to maintain schema consistency
        },
      };

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [point],
      });

      console.log(`Successfully stored config: ${configKey}`);
      return true;
    } catch (error) {
      console.error(`Error storing config '${configKey}':`, error);
      return false;
    }
  }

  /**
   * Retrieve configuration data from Qdrant using scroll
   */
  async getConfig(configKey: string): Promise<string | null> {
    try {
      // Scroll through points to find config (scroll doesn't support filters well in REST API)
      let offset: string | number | undefined = undefined;
      
      while (true) {
        const response = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset,
          with_payload: true,
          with_vector: false,
        });

        if (!response.points || response.points.length === 0) {
          break;
        }

        // Look for our config in this batch
        for (const point of response.points) {
          const payload = point.payload as any;
          if (payload?.type === 'config' && payload?.config_key === configKey) {
            const configValue = payload?.config_value;
            console.log(`Retrieved config: ${configKey}`);
            return configValue || null;
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

      console.log(`Config not found: ${configKey}`);
      return null;
    } catch (error) {
      console.error(`Error retrieving config '${configKey}':`, error);
      return null;
    }
  }

  /**
   * Delete configuration data from Qdrant using scroll to find then delete
   */
  async deleteConfig(configKey: string): Promise<boolean> {
    try {
      const pointIdsToDelete: (string | number)[] = [];
      let offset: string | number | undefined = undefined;
      
      // Scroll through all points to find matching configs
      while (true) {
        const response = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset,
          with_payload: true,
          with_vector: false,
        });

        if (!response.points || response.points.length === 0) {
          break;
        }

        // Find config points matching our key
        for (const point of response.points) {
          const payload = point.payload as any;
          if (payload?.type === 'config' && payload?.config_key === configKey) {
            pointIdsToDelete.push(point.id);
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

      // Delete found config points
      if (pointIdsToDelete.length > 0) {
        await this.client.delete(this.collectionName, {
          wait: true,
          points: pointIdsToDelete,
        });
        console.log(`Successfully deleted ${pointIdsToDelete.length} config point(s): ${configKey}`);
      } else {
        console.log(`No config found to delete: ${configKey}`);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting config '${configKey}':`, error);
      throw error; // Re-throw to let uploadConfig know there was an error
    }
  }
}

/**
 * Create Qdrant manager from environment variables
 * @param collectionName Optional custom collection name. If not provided, uses env variable
 */
export function createQdrantManager(collectionName?: string): QdrantManager {
  const config: QdrantConfig = {
    url: process.env.QDRANT_URL || '',
    apiKey: process.env.QDRANT_API_KEY || '',
    collectionName: collectionName || process.env.QDRANT_COLLECTION_NAME || 'knowledge_base',
  };

  if (!config.url || !config.apiKey) {
    throw new Error('QDRANT_URL and QDRANT_API_KEY must be set in environment variables');
  }

  return new QdrantManager(config);
}

