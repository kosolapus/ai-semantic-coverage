import { NodeKind, PageKind, PageSummary, SemanticChunk } from './types';
import ollama from 'ollama';
import { v4 } from 'uuid';
import { QdrantAdapter } from '../../infra/db/vector/qdrant.adapter';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  private readonly summaryModel = 'ministral-3:3b-cloud';
  private readonly chunkingModel = 'rnj-1:8b-cloud';
  private readonly embeddingModel = 'embeddinggemma';

  constructor(private readonly qdrant: QdrantAdapter) {}

  /* ===================== PUBLIC API ===================== */

  async upsertPage(collection: string, filePath: string, rawText: string) {
    this.logger.log(`Processing page ${filePath}`);

    // 1. Саммаризация + тип
    const pageSummary = await this.summarizePage(rawText);
    this.logger.log(`Page summarized`);

    // 2. Upsert страницы целиком
    const pageId = v4();
    const pageVector = await this.embed(
      JSON.stringify({
        ...pageSummary,
        filePath,
        nodeKind: NodeKind.PAGE,
      }),
    );
    this.logger.log(`Page embedded`);

    await this.qdrant.upsertPoint(collection, pageId, pageVector, {
      nodeKind: NodeKind.PAGE,
      pageKind: pageSummary.kind,
      filePath,
      summary: pageSummary.summary,
      text: rawText,
    });

    // 3. Семантическая нарезка (ТОЛЬКО через LLM)
    const chunks = await this.chunkPage(rawText, pageSummary.kind, filePath);
    this.logger.log(`Processing chunks: ${chunks.length}`);

    // 4. Upsert дочерних узлов
    for (const chunk of chunks) {
      try {
        const vector = await this.embed(chunk.text);
        this.logger.log(`Chunk embedded`);

        await this.qdrant.upsertPoint(collection, v4(), vector, {
          nodeKind: chunk.kind,
          pageKind: pageSummary.kind,
          parentPageId: pageId,
          filePath,
          title: chunk.title,
          description: chunk.description,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          text: chunk.text,
        });
        this.logger.log('finish chunks save');
      } catch (e) {
        this.logger.warn('Skip chunk', {
          filePath,
          kind: chunk.kind,
          title: chunk.title,
        });
      }
    }
  }

  /* ===================== LLM STEPS ===================== */

  private async summarizePage(text: string): Promise<PageSummary> {
    const resp = await ollama.chat({
      model: this.summaryModel,
      options: {
        temperature: 0.1,
      },
      messages: [
        {
          role: 'system',
          content: `You analyze a file and classify its primary purpose. Script if it is infra script, 
code - if a part of app. If not shure - unknown, if cannot detect - other
Return result in this format ONLY:

TYPE: <code|test|doc|script|other|unknown>
SUMMARY: <short explanation of what this file is about>

No markdown. No explanations.`,
        },
        { role: 'user', content: text },
      ],
    });

    const cleaned = this.cleanLLM(resp.message.content);

    const typeMatch = cleaned.match(/TYPE:\s*(\w+)/i);
    const summaryMatch = cleaned.match(/SUMMARY:\s*(.+)/is);

    return {
      kind: (typeMatch?.[1]?.toLowerCase() as PageKind) ?? PageKind.UNKNOWN,
      summary: summaryMatch?.[1]?.trim() ?? '',
    };
  }

  private async chunkPage(
    text: string,
    kind: PageKind,
    filePath?: string,
  ): Promise<SemanticChunk[]> {
    const systemPrompt =
      kind === PageKind.TEST
        ? this.testChunkingPrompt()
        : this.codeChunkingPrompt();

    const resp = await ollama.chat({
      model: this.chunkingModel,
      options: {
        temperature: 0.1,
      },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `Here this file located, use it for intention detect: ${filePath}, TEXT:` +
            text,
        },
      ],
    });

    this.logger.log(`${kind} Chunked`);

    const cleaned = this.cleanLLM(resp.message.content);
    return this.parseChunks(cleaned);
  }

  /* ===================== PROMPTS ===================== */

  private codeChunkingPrompt() {
    return `
You split source code into meaningful logical blocks.

For each block output:

---CHUNK---
KIND: code_block
TITLE: short name
DESCRIPTION: what this block does
TEXT:
<verbatim code>

Rules:
- Split by semantic responsibility, not by size
- Functions, classes, major logic blocks
- Do NOT explain outside chunks
`;
  }

  private testChunkingPrompt() {
    return `
You analyze test files.

Split into:
- test suites
- test cases
- assertions if meaningful

Format:

---CHUNK---
KIND: test_suite | test_case | assertion
TITLE: short name
DESCRIPTION: what is verified
TEXT:
<verbatim code without any formatting>

Rules:
- Reflect intent, not syntax
- Ignore boilerplate
`;
  }

  /* ===================== UTILS ===================== */

  private async embed(text: string): Promise<number[]> {
    const resp = await ollama.embed({
      model: this.embeddingModel,
      input: text,
      dimensions: 768,
    });
    return resp.embeddings[0];
  }

  private cleanLLM(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  private parseChunks(text: string): SemanticChunk[] {
    const blocks = text.split('---CHUNK---').slice(1);

    return blocks.map((block) => {
      const kind = block.match(/KIND:\s*(.+)/)?.[1]?.trim() as NodeKind;

      const title = block.match(/TITLE:\s*(.+)/)?.[1]?.trim();
      const description = block.match(/DESCRIPTION:\s*(.+)/)?.[1]?.trim();

      const textMatch = block.match(/TEXT:\s*([\s\S]+)/);

      return {
        kind,
        title,
        description: description ?? '',
        text: textMatch?.[1]?.trim() ?? '',
      };
    });
  }

  /* ============ search ============ */

  async search(collection: string, query: string, top = 5) {
    const vector = await this.embed(query);
    return this.qdrant.search(collection, vector, top);
  }
}
