import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BusinessContext } from '../types';

export type CatalogSnapshot = {
  business: BusinessContext['business'];
  agent: BusinessContext['agent'];
  products: BusinessContext['products'];
  catalogPromptBlock: string;
};

type Entry = { expiresAt: number; value: CatalogSnapshot };

@Injectable()
export class AiContextCacheService {
  private readonly logger = new Logger(AiContextCacheService.name);
  private readonly store = new Map<string, Entry>();

  constructor(private readonly config: ConfigService) {}

  private ttlMs(): number {
    const raw = Number(
      this.config.get<string>('AI_CONTEXT_CACHE_TTL_MS', '45000'),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : 45_000;
  }

  get(businessId: string): CatalogSnapshot | null {
    const row = this.store.get(businessId);
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      this.store.delete(businessId);
      return null;
    }
    return row.value;
  }

  set(businessId: string, value: CatalogSnapshot): void {
    this.store.set(businessId, {
      value,
      expiresAt: Date.now() + this.ttlMs(),
    });
  }

  invalidate(businessId: string): void {
    if (this.store.delete(businessId)) {
      this.logger.debug(`AI context cache invalidated business=${businessId}`);
    }
  }
}
