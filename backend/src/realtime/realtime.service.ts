import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const workspaceRoom = (workspaceId: string) => `workspace:${workspaceId}`;
export const userRoom = (userId: string) => `user:${userId}`;

// Pushes changes to connected devices. Every REST or socket mutation calls it after saving to PostgreSQL,
// so all devices of the people in a workspace see the same data without refreshing.
@Injectable()
export class RealtimeService {
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
    this.server?.to(workspaceRoom(workspaceId)).emit(event, payload);
  }

  // For private data (habits): reaches only the devices of that user.
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  // Puts the user's open sockets in a workspace room (when they are added to it or create it).
  joinWorkspace(userId: string, workspaceId: string) {
    this.server?.in(userRoom(userId)).socketsJoin(workspaceRoom(workspaceId));
  }

  leaveWorkspace(userId: string, workspaceId: string) {
    this.server?.in(userRoom(userId)).socketsLeave(workspaceRoom(workspaceId));
  }
}
