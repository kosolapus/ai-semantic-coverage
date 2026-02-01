// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { QdrantAdapter } from '@/infra/db/vector/qdrant.adapter';
import ollama from 'ollama';
import finalPrompt from '@/prompts/final_prompt.md';

@Injectable()
export class CalculatePipeline {
  private treshold = 0.5;
  private summaryModel = 'qwen3-next:80b-cloud';

  constructor(private readonly vectorDb: QdrantAdapter) {}

  async processCalculate(project: string) {
    const requirements = await this.fetchAllRequirements(project);
    const payload: any[] = [];

    for (const req of requirements) {
      const responseItem: Record<string, any> = {
        ...req,
        payload: {
          source: req.payload.source,
          mainIntent: req.payload.mainIntent,
          id: req.payload.id,
          quality: req.payload.quality,
        },
      };
      const intents = await this.findIntentsForReq(project, req);

      const intentsWithPayload: any[] = [];
      for (const intent of intents) {
        const intentPayload: Record<string, any> = {
          requirementId: req.id,
          intentId: intent.id,
          intent: intent.payload?.mainIntent,
          nearTests: [],
          suitsWithTests: [],
        };

        intentPayload.nearTests = (await this.findCloseTests(project, intent))
          .filter((test) => test.score > this.treshold)
          .map((test) => ({
            ...test,
            payload: {
              filePath: test.payload.filePath,
              mainIntent: test.payload.mainIntent,
              reference: test.payload.reference,
              id: test.payload.id,
            },
          }));

        const nearSuits = await this.findCloseSuits(project, intent);

        intentPayload.suitsWithTests = [] as Record<string, any>[];

        for (const suit of nearSuits) {
          if (suit.score < this.treshold) {
            continue;
          }
          const suitTests = (await this.findTestBySuit(project, suit)).filter(
            (test) => test.score > this.treshold / 2,
          );
          intentPayload.suitsWithTests.push({
            id: suit.id,
            score: suit.score,
            tests: suitTests,
          });
        }
        intentsWithPayload.push(intentPayload);
      }
      responseItem.intents = intentsWithPayload;

      delete responseItem.vector;
      payload.push(responseItem);
    }

    const resp = await ollama.chat({
      model: this.summaryModel,
      think: 'low',
      options: {
        temperature: 0.1,
      },
      messages: [
        {
          role: 'system',
          content: finalPrompt,
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    });

    return resp.message?.content;
  }

  private async fetchAllRequirements(project: string) {
    const res = await this.vectorDb.client.scroll(project, {
      filter: {
        must: [{ key: 'type', match: { value: 'requirement' } }],
      },
      with_payload: true,
      with_vector: true,
      limit: 20000,
    });

    return res.points;
  }

  private async findIntentsForReq(project: string, req: any) {
    if (!req?.payload?.id) {
      return [];
    }
    const res = await this.vectorDb.client.scroll(project, {
      filter: {
        must: [
          { key: 'type', match: { value: 'intent' } },
          { key: 'parent_id', match: { value: req.payload?.id } },
        ],
      },
      with_payload: true,
      with_vector: true,
      limit: 20000,
    });

    return res.points;
  }

  private async findCloseTests(project: string, intent: any) {
    if (!intent.vector) return [];

    const res = await this.vectorDb.client.search(project, {
      vector: intent.vector,
      limit: 20,
      filter: {
        must: [{ key: 'type', match: { value: 'test' } }],
      },
      with_payload: true,
    });

    return res.map((hit) => ({
      id: hit.id,
      score: hit.score,
      payload: hit.payload,
    }));
  }

  private async findCloseSuits(project: string, intent: any) {
    if (!intent.vector) return [];

    const res = await this.vectorDb.client.search(project, {
      vector: intent.vector as number[],
      limit: 10,
      filter: {
        must: [{ key: 'type', match: { value: 'suite' } }],
      },
      with_payload: true,
    });

    return res.map((hit) => ({
      id: hit.id,
      score: hit.score,
      payload: hit.payload,
    }));
  }

  private async findTestBySuit(project: string, suite: any) {
    const res = await this.vectorDb.client.scroll(project, {
      filter: {
        must: [
          { key: 'type', match: { value: 'test' } },
          { key: 'parent_id', match: { value: suite.id } },
        ],
      },
      with_payload: true,
      limit: 20000,
    });

    return res.points.map((p) => ({
      id: p.id,
      score: suite.score * 0.9,
      payload: p.payload,
    }));
  }
}
