import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextBuilderService } from '../context/context-builder.service';
import type {
  AiEngineResult,
  AiIntent,
  BusinessContext,
  ConversionStageName,
  ToolName,
} from '../types';
import { AiToolsService } from '../tools/ai-tools.service';
import { RulesEngine } from './rules.engine';

type OpenAiToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

@Injectable()
export class LlmEngine {
  private readonly logger = new Logger(LlmEngine.name);

  constructor(
    private readonly config: ConfigService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly tools: AiToolsService,
    private readonly rules: RulesEngine,
  ) {}

  isEnabled() {
    return Boolean(this.config.get<string>('OPENAI_API_KEY')?.trim());
  }

  async run(ctx: BusinessContext): Promise<AiEngineResult | null> {
    if (!this.isEnabled()) return null;

    const apiKey = this.config.get<string>('OPENAI_API_KEY')!;
    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

    const system = [
      'You are bee3ly, an Egyptian AI growth employee for social DMs.',
      'Reply in the customer language (usually Egyptian Arabic). Be concise and natural.',
      'Never invent prices, stock, delivery fees, hours, discounts, or order IDs.',
      'Use tools for business facts and conversions.',
      'If unsure or customer asks for a human, call transferToHuman.',
      'Return a short customer-facing reply after tools.',
      '',
      this.contextBuilder.toPromptBlock(ctx),
    ].join('\n');

    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: system },
      ...ctx.history.slice(-12).map((m) => ({
        role: m.role === 'CUSTOMER' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: ctx.latestCustomerMessage },
    ];

    const toolsUsed: ToolName[] = [];
    let order: unknown = null;
    let lead: unknown = null;
    let needsHuman = false;
    let handoffReason: string | undefined;
    let conversionStage: ConversionStageName = this.rules.stageForIntent(
      this.rules.detectIntent(ctx.latestCustomerMessage),
      ctx.conversionStage,
    );
    let intent: AiIntent = this.rules.detectIntent(ctx.latestCustomerMessage);

    try {
      for (let round = 0; round < 3; round++) {
        const body = {
          model,
          temperature: 0.4,
          messages,
          tools: this.openAiTools(),
          tool_choice: 'auto',
        };

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          this.logger.warn(
            `OpenAI error ${res.status}: ${errText.slice(0, 200)}`,
          );
          return null;
        }

        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string | null;
              tool_calls?: OpenAiToolCall[];
            };
          }>;
        };
        const message = data.choices?.[0]?.message;
        if (!message) return null;

        const toolCalls = message.tool_calls ?? [];
        if (toolCalls.length === 0) {
          const reply = (message.content ?? '').trim();
          if (!reply) return null;
          return {
            reply,
            intent,
            toolsUsed,
            order,
            lead,
            needsHuman,
            conversionStage,
            handoffReason,
            mode: 'llm',
            confidence: 0.8,
          };
        }

        messages.push({
          role: 'assistant',
          content: message.content,
          tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
          const name = call.function.name as ToolName;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || '{}') as Record<
              string,
              unknown
            >;
          } catch {
            args = {};
          }

          toolsUsed.push(name);
          if (name === 'createOrder') intent = 'PURCHASE_INTENT';
          if (name === 'createLead') intent = 'LEAD_INTENT';
          if (name === 'transferToHuman') {
            intent = 'HUMAN_REQUEST';
            needsHuman = true;
            handoffReason =
              typeof args.reason === 'string' ? args.reason : 'AI handoff';
            conversionStage = 'HUMAN_HANDOFF';
          }

          let result: unknown;
          try {
            result = await this.tools.execute(name, ctx, args);
            if (name === 'createOrder') {
              order = result;
              conversionStage = 'CONVERTED';
            }
            if (name === 'createLead') lead = result;
          } catch (e) {
            result = {
              error: e instanceof Error ? e.message : 'tool_failed',
            };
          }

          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
      }
    } catch (e) {
      this.logger.warn(
        `LLM engine failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
      return null;
    }

    return null;
  }

  private openAiTools() {
    const prop = (
      properties: Record<string, unknown>,
      required: string[] = [],
    ) => ({
      type: 'object',
      properties,
      required,
    });

    return [
      {
        type: 'function',
        function: {
          name: 'getProduct',
          description: 'Get product/service facts from catalog',
          parameters: prop({
            productId: { type: 'string' },
            name: { type: 'string' },
          }),
        },
      },
      {
        type: 'function',
        function: {
          name: 'checkStock',
          description: 'Check stock and variants',
          parameters: prop({
            productId: { type: 'string' },
            size: { type: 'string' },
          }),
        },
      },
      {
        type: 'function',
        function: {
          name: 'getDeliveryInfo',
          description: 'Get delivery/hours/payment info',
          parameters: prop({}),
        },
      },
      {
        type: 'function',
        function: {
          name: 'getBusinessInfo',
          description: 'Get business profile facts',
          parameters: prop({}),
        },
      },
      {
        type: 'function',
        function: {
          name: 'getFAQ',
          description: 'Get business FAQs',
          parameters: prop({}),
        },
      },
      {
        type: 'function',
        function: {
          name: 'createOrder',
          description: 'Create validated order when name+phone known',
          parameters: prop(
            {
              productId: { type: 'string' },
              customerName: { type: 'string' },
              customerPhone: { type: 'string' },
              size: { type: 'string' },
              quantity: { type: 'number' },
            },
            ['customerName', 'customerPhone'],
          ),
        },
      },
      {
        type: 'function',
        function: {
          name: 'getOrderStatus',
          description: 'Lookup latest or numbered order status',
          parameters: prop({ orderNumber: { type: 'number' } }),
        },
      },
      {
        type: 'function',
        function: {
          name: 'createLead',
          description:
            'Create a lead when customer is interested but not ordering yet',
          parameters: prop({
            intent: { type: 'string' },
            notes: { type: 'string' },
          }),
        },
      },
      {
        type: 'function',
        function: {
          name: 'notifyOwner',
          description: 'Notify business owner',
          parameters: prop({
            title: { type: 'string' },
            body: { type: 'string' },
          }),
        },
      },
      {
        type: 'function',
        function: {
          name: 'transferToHuman',
          description: 'Hand conversation to human team',
          parameters: prop({
            reason: { type: 'string' },
            summary: { type: 'string' },
          }),
        },
      },
    ];
  }
}
