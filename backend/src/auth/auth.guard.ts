import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../users/user.entity';
import type { Workspace } from '../workspaces/workspace.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuthService } from './auth.service';

export type AuthedRequest = Request & { user: User; workspace: Workspace };

// Protects a route: only requests with a valid `Authorization: Bearer <token>` pass.
// The logged-in user is attached to the request for the handler.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedException({ detail: 'Not authenticated' });

    const user = await this.auth.userFromToken(token);
    if (!user) throw new UnauthorizedException({ detail: 'Could not validate credentials' });
    req.user = user;
    return true;
  }
}

// Picks the workspace for the request: `X-Workspace-Id` header (or `workspaceId` query), else the user's
// personal workspace. Membership is checked, so nobody reads another workspace's data. Use after JwtAuthGuard.
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly workspaces: WorkspacesService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['x-workspace-id'];
    const requested = (Array.isArray(header) ? header[0] : header) ?? (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined);
    req.workspace = await this.workspaces.resolve(req.user.id, requested || undefined);
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user,
);

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().workspace,
);
