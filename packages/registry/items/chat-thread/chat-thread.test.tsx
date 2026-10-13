import { render, screen } from '@testing-library/react-native';

import { ChatThread, type ChatMessage } from './chat-thread';

const MESSAGES: ChatMessage[] = [
  { id: '1', from: 'them', text: 'Are we still on for Saturday?' },
  { id: '2', from: 'them', text: 'The forecast looks good', time: '09:40' },
  { id: '3', from: 'me', text: 'Yes! Meet at the station at 8?', time: '09:41' },
];

describe('ChatThread', () => {
  it('reads every message with its sender and time', async () => {
    await render(<ChatThread messages={MESSAGES} name="Maya" />);
    expect(screen.getByLabelText('Maya: Are we still on for Saturday?')).toBeOnTheScreen();
    expect(screen.getByLabelText('You: Yes! Meet at the station at 8?, 09:41')).toBeOnTheScreen();
  });

  it('shows the time only under the last message of a group', async () => {
    await render(<ChatThread messages={MESSAGES} />);
    expect(screen.getAllByText(/^09:4/, { includeHiddenElements: true })).toHaveLength(2);
  });

  it('shows typing and seen', async () => {
    const { rerender } = await render(<ChatThread messages={MESSAGES} name="Maya" />);
    expect(screen.queryByLabelText('Maya is typing')).toBeNull();
    await rerender(<ChatThread messages={MESSAGES} name="Maya" typing seen />);
    expect(screen.getByLabelText('Maya is typing')).toBeOnTheScreen();
    expect(screen.getByText('Seen')).toBeOnTheScreen();
  });

  it('adds new messages', async () => {
    const { rerender } = await render(<ChatThread messages={MESSAGES} />);
    await rerender(
      <ChatThread messages={[...MESSAGES, { id: '4', from: 'them', text: 'Perfect' }]} />,
    );
    expect(screen.getByLabelText('Them: Perfect')).toBeOnTheScreen();
  });
});
