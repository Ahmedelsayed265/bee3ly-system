import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BusinessAccessService } from '../common/business-access.service';
import { RealtimeService } from './realtime.service';

function parseFrontendOrigins(raw: string | undefined): string[] | boolean {
  const origins = (raw ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.includes('*')) return true;
  return origins;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: parseFrontendOrigins(process.env.FRONTEND_URL),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
    private readonly access: BusinessAccessService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      const businessId = await this.access.requireBusinessId(payload.sub);
      const room = `business:${businessId}`;
      await client.join(room);
      client.data.userId = payload.sub;
      client.data.businessId = businessId;
      this.logger.debug(`Socket ${client.id} joined ${room}`);
    } catch (err) {
      this.logger.debug(
        `Socket auth failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7).trim();
    }

    return null;
  }
}
