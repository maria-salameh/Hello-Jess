import { Logger } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RealtimeService, userRoom, workspaceRoom } from './realtime.service';

// The WebSocket entry point. A client connects with its JWT (`io(url, { auth: { token } })`).
// A middleware checks the token before the connection is accepted, then puts the socket in a room for
// the user and one room per workspace the user belongs to. A bad token is refused with `connect_error`.
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? '*' } })
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly workspaces: WorkspacesService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
    server.use(async (socket, next) => {
      try {
        const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
        const user = await this.auth.userFromToken(token);
        if (!user) return next(new Error('Could not validate credentials'));

        socket.data.userId = user.id;
        await socket.join(userRoom(user.id));
        for (const id of await this.workspaces.listIdsForUser(user.id)) await socket.join(workspaceRoom(id));
        next();
      } catch (err) {
        this.logger.warn(`Socket ${socket.id} refused: ${(err as Error).message}`);
        next(new Error('Could not validate credentials'));
      }
    });
  }
}
