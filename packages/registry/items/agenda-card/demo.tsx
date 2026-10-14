import { useState } from 'react';
import { View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { AgendaCard, type AgendaEvent } from './agenda-card';

export const controls = defineControls({});

const DAY: AgendaEvent[] = [
  { id: 'standup', title: 'Team standup', start: '09:30', end: '09:45' },
  { id: 'focus', title: 'Deep work', start: '10:00', end: '12:00', progress: 0.4 },
  { id: 'review', title: 'Design review', start: '13:30', end: '14:30' },
  { id: 'gym', title: 'Gym', start: '18:00', end: '19:00' },
];

const EXTRA = ['Coffee with Sam', 'Call the bank', 'Pick up parcel', 'Read a chapter'];

export default function AgendaCardDemo() {
  const [events, setEvents] = useState(DAY);
  const [added, setAdded] = useState(0);
  return (
    <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
      <AgendaCard
        date="Oct 30"
        weekday="Thursday"
        events={events}
        total={events.length + 2}
        onAdd={() => {
          // A new event lands right after the one under way.
          const title = EXTRA[added % EXTRA.length]!;
          setAdded((n) => n + 1);
          setEvents((list) => [
            list[0]!,
            list[1]!,
            { id: `new-${added}`, title, start: '12:15', end: '12:45' },
            ...list.slice(2),
          ]);
        }}
      />
    </View>
  );
}
