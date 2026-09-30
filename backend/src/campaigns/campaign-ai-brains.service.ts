import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MerchantTokenService } from '../channels/merchant-token.service';
import type {
  CampaignAnalysisResult,
  CampaignAnalysisVerdict,
} from './campaign-analysis';
import {
  CAMPAIGN_AD_COPY_SYSTEM_AR,
  CAMPAIGN_AD_COPY_SYSTEM_EN,
  sanitizeSocialAdCopy,
} from './campaign-ad-copy-style';

export type CampaignContentBrainResult = {
  adCopy: string;
  adCopyVariations: string[];
  headline: string;
  valueProposition: string;
  cta: string;
  creativeBrief: string;
  audienceHint: string;
  mode: 'gemini' | 'openai' | 'rules';
};

export type CampaignAnalysisBrainMode = 'gemini' | 'openai' | 'rules';

function asOptionalText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function asRequiredText(value: unknown): string | null {
  const text = asOptionalText(value).trim();
  return text.length > 0 ? text : null;
}

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asOptionalText(item).trim())
    .filter((item) => item.length > 0);
}

@Injectable()
export class CampaignAiBrainsService {
  private readonly logger = new Logger(CampaignAiBrainsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tokens: MerchantTokenService,
  ) {}

  async generateContent(
    businessId: string,
    input: {
      name: string;
      productId: string;
      objective?: string;
      audienceDescription?: string;
      budget?: number;
      valueProposition?: string;
      locale?: string;
      product?: {
        name: string;
        description: string | null;
        priceEgp: number;
      };
    },
    rulesFallback: () => CampaignContentBrainResult,
  ): Promise<CampaignContentBrainResult> {
    const fromService = await this.postContentBrain(businessId, input);
    if (fromService) return fromService;

    const fromOpenAi = await this.openAiContent(input);
    if (fromOpenAi) return fromOpenAi;

    return rulesFallback();
  }

  async enrichAnalysis(
    businessId: string,
    input: {
      locale: string;
      campaign: Record<string, unknown>;
      rules: CampaignAnalysisResult;
    },
  ): Promise<{
    summary: string;
    bullets: string[];
    mode: CampaignAnalysisBrainMode;
  } | null> {
    const fromService = await this.postAnalysisBrain(businessId, input);
    if (fromService) return fromService;

    const fromOpenAi = await this.openAiAnalysis(input);
    if (fromOpenAi) return fromOpenAi;

    return null;
  }

  private engineBaseUrl(): string | null {
    const raw =
      this.config.get<string>('AI_SERVICE_URL')?.trim() ||
      this.config.get<string>('AI_ENGINE_URL')?.trim();
    if (!raw) return null;
    return raw.replace(/\/$/, '').replace(/\/api\/v1\/chat$/i, '');
  }

  private timeoutMs(): number {
    const raw = this.config.get<string>('AI_SERVICE_TIMEOUT_MS', '20000');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 20000;
  }

  private async postContentBrain(
    businessId: string,
    input: {
      name: string;
      productId: string;
      objective?: string;
      audienceDescription?: string;
      budget?: number;
      valueProposition?: string;
      locale?: string;
    },
  ): Promise<CampaignContentBrainResult | null> {
    const base = this.engineBaseUrl();
    if (!base) return null;

    let token: string;
    try {
      token = await this.tokens.issueForMerchant(businessId);
    } catch (error) {
      this.logger.warn(`Campaign content brain: no merchant token — ${error}`);
      return null;
    }

    const url = `${base}/api/v1/campaigns/content`;
    const body = await this.postJson(url, token, {
      name: input.name,
      productId: input.productId,
      objective: input.objective ?? 'MORE_ORDERS',
      audienceDescription: input.audienceDescription,
      budget: input.budget,
      valueProposition: input.valueProposition,
      locale: input.locale ?? 'ar',
    });
    if (!body?.ok) return null;
    const adCopy = asRequiredText(body.ad_copy);
    if (!adCopy) return null;

    return {
      adCopy: sanitizeSocialAdCopy(adCopy),
      adCopyVariations: asTextList(body.ad_copy_variations).map(
        sanitizeSocialAdCopy,
      ),
      headline: asOptionalText(body.headline).trim(),
      valueProposition: asOptionalText(body.value_proposition).trim(),
      cta: asOptionalText(body.cta).trim(),
      creativeBrief: asOptionalText(body.creative_brief).trim(),
      audienceHint: asOptionalText(body.audience_hint).trim(),
      mode: 'gemini',
    };
  }

  private async postAnalysisBrain(
    businessId: string,
    input: {
      locale: string;
      campaign: Record<string, unknown>;
      rules: CampaignAnalysisResult;
    },
  ): Promise<{
    summary: string;
    bullets: string[];
    mode: CampaignAnalysisBrainMode;
  } | null> {
    const base = this.engineBaseUrl();
    if (!base) return null;

    let token: string;
    try {
      token = await this.tokens.issueForMerchant(businessId);
    } catch (error) {
      this.logger.warn(`Campaign analysis brain: no merchant token — ${error}`);
      return null;
    }

    const url = `${base}/api/v1/campaigns/analysis`;
    const body = await this.postJson(url, token, {
      locale: input.locale,
      campaign: input.campaign,
      rules: {
        verdict: input.rules.verdict,
        confidence: input.rules.confidence,
        summary: input.rules.summary,
        bullets: input.rules.bullets,
        actions: input.rules.actions,
        risks: input.rules.risks,
        figures: input.rules.figures,
      },
    });
    if (!body?.ok) return null;
    const summary = asRequiredText(body.summary);
    if (!summary) return null;

    const bullets = asTextList(body.bullets);

    return {
      summary,
      bullets: bullets.length > 0 ? bullets : input.rules.bullets,
      mode: 'gemini',
    };
  }

  private async postJson(
    url: string,
    bearer: string,
    payload: unknown,
  ): Promise<Record<string, unknown> | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(`Campaign brain HTTP ${response.status} ${url}`);
        return null;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Campaign brain request failed: ${error}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async openAiContent(input: {
    name: string;
    productId: string;
    objective?: string;
    audienceDescription?: string;
    budget?: number;
    valueProposition?: string;
    locale?: string;
  }): Promise<CampaignContentBrainResult | null> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return null;

    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    const locale = input.locale === 'en' ? 'en' : 'ar';

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.65,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  locale === 'ar'
                    ? CAMPAIGN_AD_COPY_SYSTEM_AR
                    : CAMPAIGN_AD_COPY_SYSTEM_EN,
              },
              {
                role: 'user',
                content: JSON.stringify(input),
              },
            ],
          }),
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) return null;
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const adCopy = asRequiredText(parsed.ad_copy);
      if (!adCopy) return null;
      return {
        adCopy: sanitizeSocialAdCopy(adCopy),
        adCopyVariations: asTextList(parsed.ad_copy_variations).map(
          sanitizeSocialAdCopy,
        ),
        headline: asOptionalText(parsed.headline).trim(),
        valueProposition: asOptionalText(parsed.value_proposition).trim(),
        cta: asOptionalText(parsed.cta).trim(),
        creativeBrief: asOptionalText(parsed.creative_brief).trim(),
        audienceHint: asOptionalText(parsed.audience_hint).trim(),
        mode: 'openai',
      };
    } catch (error) {
      this.logger.warn(`OpenAI content brain failed: ${error}`);
      return null;
    }
  }

  private async openAiAnalysis(input: {
    locale: string;
    campaign: Record<string, unknown>;
    rules: CampaignAnalysisResult;
  }): Promise<{
    summary: string;
    bullets: string[];
    mode: CampaignAnalysisBrainMode;
  } | null> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return null;

    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    const locale = input.locale === 'en' ? 'en' : 'ar';
    const verdict = input.rules.verdict;

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.35,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  locale === 'ar'
                    ? `Analysis & Decisions brain. verdict ثابت = ${verdict}. JSON: verdict, summary, bullets[].`
                    : `Analysis & Decisions brain. Fixed verdict = ${verdict}. JSON: verdict, summary, bullets[].`,
              },
              {
                role: 'user',
                content: JSON.stringify({
                  campaign: input.campaign,
                  rules: input.rules,
                }),
              },
            ],
          }),
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) return null;
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const summary = asRequiredText(parsed.summary);
      if (!summary) return null;
      const bullets = asTextList(parsed.bullets);
      const outVerdict = asOptionalText(
        parsed.verdict || verdict,
      ) as CampaignAnalysisVerdict;
      if (outVerdict !== verdict) {
        this.logger.debug('OpenAI tried to change verdict — keeping rules');
      }
      return {
        summary,
        bullets: bullets.length > 0 ? bullets : input.rules.bullets,
        mode: 'openai',
      };
    } catch (error) {
      this.logger.warn(`OpenAI analysis brain failed: ${error}`);
      return null;
    }
  }
}
