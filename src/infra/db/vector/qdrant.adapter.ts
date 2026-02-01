import { QdrantClient } from '@qdrant/qdrant-js';

export class QdrantAdapter {
  client: QdrantClient;
  public static baseVectorSize = 768;

  constructor() {
    this.client = new QdrantClient({ url: 'http://localhost:6333' });
  }

  async createCollection(name: string, vectorSize?: number) {
    await this.client.createCollection(name, {
      vectors: {
        size: vectorSize ?? QdrantAdapter.baseVectorSize,
        distance: 'Cosine',
      },
    });
  }

  async upsertPoint(
    collection: string,
    id: string,
    vector: number[],
    payload: Record<string, unknown>,
  ) {
    await this.client.upsert(collection, {
      points: [{ id, vector, payload }],
    });
  }

  async search(collection: string, vector: number[], top: number) {
    const result = await this.client.search(collection, {
      vector,
      limit: top,
    });
    return result;
  }

  async prepareCollection(name: string) {
    try {
      await this.client.getCollection(name);
    } catch {
      await this.createCollection(name);
    }
  }
}
