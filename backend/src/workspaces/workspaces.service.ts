import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { UsersService } from '../users/users.service';
import { Workspace, WorkspaceMember } from './workspace.entity';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace) private readonly workspaces: Repository<Workspace>,
    @InjectRepository(WorkspaceMember) private readonly members: Repository<WorkspaceMember>,
    private readonly users: UsersService,
    private readonly realtime: RealtimeService,
  ) {}

  createPersonal(userId: string, ownerName: string) {
    return this.create(userId, `${ownerName}'s workspace`, true);
  }

  async create(userId: string, name: string, isPersonal = false) {
    const workspace = await this.workspaces.save(this.workspaces.create({ name, ownerId: userId, isPersonal }));
    await this.members.save(this.members.create({ workspaceId: workspace.id, userId, role: 'owner' }));
    this.realtime.joinWorkspace(userId, workspace.id);
    return workspace;
  }

  async listIdsForUser(userId: string): Promise<string[]> {
    return (await this.members.findBy({ userId })).map((m) => m.workspaceId);
  }

  // The workspaces the user belongs to, each with its members.
  async listForUser(userId: string) {
    const ids = await this.listIdsForUser(userId);
    if (ids.length === 0) return [];
    const [workspaces, memberships] = await Promise.all([
      this.workspaces.findBy({ id: In(ids) }),
      this.members.findBy({ workspaceId: In(ids) }),
    ]);
    const people = new Map(
      (await this.users.findManyByIds([...new Set(memberships.map((m) => m.userId))])).map((u) => [u.id, u]),
    );
    return workspaces
      .sort((a, b) => Number(b.isPersonal) - Number(a.isPersonal) || a.createdAt.getTime() - b.createdAt.getTime())
      .map((w) => ({
        id: w.id,
        name: w.name,
        ownerId: w.ownerId,
        isPersonal: w.isPersonal,
        members: memberships
          .filter((m) => m.workspaceId === w.id)
          .map((m) => ({
            id: m.userId,
            name: people.get(m.userId)?.name ?? '',
            email: people.get(m.userId)?.email ?? '',
            role: m.role,
          })),
      }));
  }

  async isMember(workspaceId: string, userId: string) {
    return (await this.members.countBy({ workspaceId, userId })) > 0;
  }

  // The workspace to use for a request: the one asked for (membership checked), else the personal one.
  async resolve(userId: string, requestedId?: string): Promise<Workspace> {
    if (requestedId) {
      if (!(await this.isMember(requestedId, userId))) throw new NotFoundException({ detail: 'Workspace not found' });
      return (await this.workspaces.findOneBy({ id: requestedId }))!;
    }
    const personal = await this.workspaces.findOneBy({ ownerId: userId, isPersonal: true });
    if (!personal) throw new NotFoundException({ detail: 'Workspace not found' });
    return personal;
  }

  async addMember(ownerId: string, workspaceId: string, email: string) {
    const workspace = await this.workspaces.findOneBy({ id: workspaceId });
    if (!workspace || !(await this.isMember(workspaceId, ownerId))) {
      throw new NotFoundException({ detail: 'Workspace not found' });
    }
    if (workspace.ownerId !== ownerId) throw new ForbiddenException({ detail: 'Only the owner can add members' });
    if (workspace.isPersonal) throw new BadRequestException({ detail: 'A personal workspace cannot be shared' });

    const user = await this.users.findByEmail(email);
    if (!user) throw new NotFoundException({ detail: 'No account with that email' });
    if (await this.isMember(workspaceId, user.id)) throw new BadRequestException({ detail: 'Already a member' });

    await this.members.save(this.members.create({ workspaceId, userId: user.id, role: 'member' }));
    this.realtime.joinWorkspace(user.id, workspaceId);
    await this.notifyMembers(workspaceId);
    return (await this.listForUser(ownerId)).find((w) => w.id === workspaceId)!;
  }

  // The owner removes someone, or a member leaves. The owner cannot leave their own workspace.
  async removeMember(actorId: string, workspaceId: string, userId: string) {
    const workspace = await this.workspaces.findOneBy({ id: workspaceId });
    if (!workspace || !(await this.isMember(workspaceId, actorId))) {
      throw new NotFoundException({ detail: 'Workspace not found' });
    }
    if (userId === workspace.ownerId) throw new BadRequestException({ detail: 'The owner cannot be removed' });
    if (actorId !== userId && actorId !== workspace.ownerId) {
      throw new ForbiddenException({ detail: 'Only the owner can remove members' });
    }

    const result = await this.members.delete({ workspaceId, userId });
    if (!result.affected) throw new NotFoundException({ detail: 'Member not found' });
    this.realtime.leaveWorkspace(userId, workspaceId);
    this.realtime.emitToUser(userId, 'workspace:removed', { id: workspaceId });
    await this.notifyMembers(workspaceId);
  }

  private async notifyMembers(workspaceId: string) {
    const memberIds = (await this.members.findBy({ workspaceId })).map((m) => m.userId);
    for (const id of memberIds) this.realtime.emitToUser(id, 'workspace:updated', { id: workspaceId });
  }
}
