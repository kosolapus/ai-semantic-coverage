export enum PageKind {
  CODE = 'code',
  TEST = 'test',
  DOC = 'doc',
  UNKNOWN = 'unknown',
}

export enum NodeKind {
  PAGE = 'page',
  CODE_BLOCK = 'code_block',
  TEST_SUITE = 'test_suite',
  TEST_CASE = 'test_case',
  ASSERTION = 'assertion',
}

export interface PageSummary {
  kind: PageKind;
  summary: string;
}

export interface SemanticChunk {
  kind: NodeKind;
  title?: string;
  description: string;
  text: string;
  startLine?: number;
  endLine?: number;
}
