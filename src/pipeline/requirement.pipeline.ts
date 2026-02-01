import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '@/domain/embedding/embedding.service';
import { QdrantAdapter } from '@/infra/db/vector/qdrant.adapter';
import { v4 } from 'uuid';
import { intentToSentenceNatural } from '@/shared/text-utils';
import classifyDocs from '@/prompts/req.classify.md';

type Requirement = {
  id: string;
  parent_id: string | null;
  parent_type: 'document' | 'epic' | 'requirement' | null;
  type: string | null;
  source: string;
  mainIntent: string;
  quality: {
    ambiguity: 'low' | 'medium' | 'high' | null;
    verifiability: 'high' | 'medium' | 'low' | null;
    completeness: 'complete' | 'partial' | 'incomplete' | null;
    reasoning: string[];
  };
  context_path: string[];
  implicit_context: string[];
  intents: {
    id: string;
    parent_id: string | null;
    parent_type: 'document' | 'epic' | 'requirement' | null;
    type: string | null;
    what: string;
    who: string;
    when: string;
    where: string;
    why: string;
    how: string;
    reference: {
      source: string;
      text: string;
      index: number;
      ref_type: 'requirement' | 'clause';
    };
  }[];
};

type RequirementsObject = {
  requirements: Requirement[];
};

@Injectable()
export class RequirementPipeline {
  private readonly logger = new Logger(RequirementPipeline.name);

  constructor(
    private readonly embedService: EmbeddingService,
    private readonly vectorDb: QdrantAdapter,
  ) {}
  async processRequirementsList(docs: string, project: string) {
    this.logger.log('list process started:');
    const summaries = await this.embedService.summarize(docs, classifyDocs);

    let list: RequirementsObject;
    try {
      list = JSON.parse(summaries.cleaned) as RequirementsObject;
    } catch (e) {
      this.logger.error(e, summaries.cleaned);
      throw Error(e);
    }

    this.logger.log('Docs Summarized');

    if (!list.requirements) {
      return;
    }

    const docsWithoutIntents = list.requirements.map((item) => {
      return {
        ...item,
        intents: undefined,
      };
    });
    const intents = list.requirements.map((r) => r.intents).flat();

    await this.vectorDb.prepareCollection(project);

    for (const doc of docsWithoutIntents) {
      const docEmbedding = await this.embedService.embed(doc.mainIntent);
      const id = v4();
      await this.vectorDb.upsertPoint(project, id, docEmbedding, doc);
    }

    for (const intent of intents) {
      const embedString = intentToSentenceNatural(intent);
      const docEmbedding = await this.embedService.embed(embedString);
      const id = v4();
      await this.vectorDb.upsertPoint(project, id, docEmbedding, {
        ...intent,
        mainIntent: embedString,
      });
    }

    this.logger.log('Requirements extracted');
  }
}
