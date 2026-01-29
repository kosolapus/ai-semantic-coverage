import { Injectable } from '@nestjs/common';

interface Requirement {
  id: string;
  title: string;
  description: string;
  sourceLink?: string;
  level?: 'epic' | 'feature' | 'task';
}

@Injectable()
export class RequirementService {
  private store: Requirement[] = [];

  addRequirement(req: Requirement) {
    this.store.push(req);
  }

  getAll() {
    return this.store;
  }

  getById(id: string) {
    return this.store.find((r) => r.id === id);
  }
}
