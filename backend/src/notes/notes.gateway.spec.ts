import { NotFoundException } from '@nestjs/common';
import { NotesGateway } from './notes.gateway';

const noteId = '6ac39c9e-78f4-46b9-bc4f-d43a1c2e9f01';
const workspaceId = '11111111-1111-4111-8111-111111111111';

function build() {
  const notes = { update: jest.fn().mockResolvedValue({ id: noteId, content: 'hello', version: 2 }) };
  const workspaces = { resolve: jest.fn().mockResolvedValue({ id: workspaceId }) };
  const gateway = new NotesGateway(notes as never, workspaces as never);
  const client = (userId?: string) => ({ data: { userId } }) as never;
  return { gateway, notes, workspaces, client };
}

describe('NotesGateway note:edit', () => {
  it('saves a valid edit through the notes service and acknowledges it', async () => {
    const { gateway, notes, workspaces, client } = build();
    const ack = await gateway.edit(client('u1'), { id: noteId, content: 'hello' });

    expect(workspaces.resolve).toHaveBeenCalledWith('u1', undefined);
    expect(notes.update).toHaveBeenCalledWith(workspaceId, 'u1', noteId, { content: 'hello' });
    expect(ack).toEqual({ ok: true, note: { id: noteId, content: 'hello', version: 2 } });
  });

  it('refuses sockets that did not authenticate', async () => {
    const { gateway, notes, client } = build();
    expect(await gateway.edit(client(undefined), { id: noteId, content: 'x' })).toEqual({ ok: false, detail: 'Not authenticated' });
    expect(notes.update).not.toHaveBeenCalled();
  });

  it('refuses an invalid payload without touching the database', async () => {
    const { gateway, notes, client } = build();
    const bad = await gateway.edit(client('u1'), { id: 'nope', content: 'x' });
    expect(bad).toMatchObject({ ok: false });
    expect(await gateway.edit(client('u1'), { id: noteId, content: 'a'.repeat(20001) })).toMatchObject({ ok: false });
    expect(notes.update).not.toHaveBeenCalled();
  });

  it("refuses an edit in a workspace the user does not belong to", async () => {
    const { gateway, workspaces, notes, client } = build();
    workspaces.resolve.mockRejectedValue(new NotFoundException({ detail: 'Workspace not found' }));
    expect(await gateway.edit(client('u1'), { id: noteId, workspaceId })).toEqual({ ok: false, detail: 'Workspace not found' });
    expect(notes.update).not.toHaveBeenCalled();
  });
});
