import ollama from 'ollama';
import { QdrantAdapter } from '@/infra/db/vector/qdrant.adapter';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly summaryModel = 'rnj-1:8b-cloud';
  private readonly embeddingModel = 'embeddinggemma';

  constructor(private readonly vectorDb: QdrantAdapter) {}

  async summarize(
    text: string,
    systemPrompt: string,
  ): Promise<{ cleaned: string }> {
    const resp = await ollama.chat({
      model: this.summaryModel,
      think: 'low',
      options: {
        temperature: 0.1,
      },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: text },
      ],
    });

    const cleaned = this.cleanLLM(resp.message.content);

    return {
      cleaned,
    };
  }

  async embed(text: string): Promise<number[]> {
    const resp = await ollama.embed({
      model: this.embeddingModel,
      input: text,
      dimensions: QdrantAdapter.baseVectorSize,
    });
    return resp.embeddings[0];
  }

  private cleanLLM(text: string): string {
    return text
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/^```json/, '')
      .replace(/```$/, '')
      .trim();
  }

  async search(collection: string, query: string, top = 5) {
    const vector = await this.embed(query);
    return this.vectorDb.search(collection, vector, top);
  }
}
