import { describe, expect, it, vi } from 'vitest';

import { createSupabaseCloudMirrorGateway } from './cloudMirror';

type QueryResult = {
  data: Array<{ task_id: string }> | null;
  error: Error | null;
};

function reminderClient(
  updateResults: QueryResult[],
  insertError: Error | null = null,
) {
  const select = vi.fn(async () =>
    updateResults.shift() ?? { data: null, error: new Error('unexpected update') },
  );
  const updateBuilder = { eq: vi.fn(), select };
  updateBuilder.eq.mockImplementation(() => updateBuilder);
  const update = vi.fn(() => updateBuilder);
  const insert = vi.fn(async () => ({ error: insertError }));
  const from = vi.fn((table: string) => {
    expect(table).toBe('reminders');
    return { update, insert };
  });

  return { client: { from }, update, insert, eq: updateBuilder.eq };
}

describe('createSupabaseCloudMirrorGateway reminders', () => {
  it('updates only mutable fields when the reminder already exists', async () => {
    const fake = reminderClient([
      { data: [{ task_id: 'remote-task' }], error: null },
    ]);
    const gateway = createSupabaseCloudMirrorGateway(
      fake.client as unknown as Parameters<
        typeof createSupabaseCloudMirrorGateway
      >[0],
    );

    await gateway.replaceReminder(
      'user-1',
      'remote-task',
      15,
      '2026-08-30T09:45:00.000Z',
    );

    expect(fake.update).toHaveBeenCalledWith({
      minutes_before: 15,
      scheduled_for: '2026-08-30T09:45:00.000Z',
    });
    expect(fake.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(fake.eq).toHaveBeenNthCalledWith(2, 'task_id', 'remote-task');
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it('inserts ownership and link fields when no reminder exists', async () => {
    const fake = reminderClient([{ data: [], error: null }]);
    const gateway = createSupabaseCloudMirrorGateway(
      fake.client as unknown as Parameters<
        typeof createSupabaseCloudMirrorGateway
      >[0],
    );

    await gateway.replaceReminder(
      'user-1',
      'remote-task',
      60,
      '2026-08-30T09:00:00.000Z',
    );

    expect(fake.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      task_id: 'remote-task',
      minutes_before: 60,
      scheduled_for: '2026-08-30T09:00:00.000Z',
    });
  });

  it('recovers when a concurrent retry inserts first', async () => {
    const fake = reminderClient(
      [
        { data: [], error: null },
        { data: [{ task_id: 'remote-task' }], error: null },
      ],
      new Error('unique conflict'),
    );
    const gateway = createSupabaseCloudMirrorGateway(
      fake.client as unknown as Parameters<
        typeof createSupabaseCloudMirrorGateway
      >[0],
    );

    await expect(
      gateway.replaceReminder(
        'user-1',
        'remote-task',
        60,
        '2026-08-30T09:00:00.000Z',
      ),
    ).resolves.toBeUndefined();
    expect(fake.update).toHaveBeenCalledTimes(2);
  });
});
