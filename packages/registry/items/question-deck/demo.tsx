import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { QuestionDeck } from './question-deck';

export const controls = defineControls({});

const QUESTIONS = [
  {
    id: 'how',
    title: 'How would you like to make change happen?',
    options: ['D.I.Y.', 'Contractor', 'Property Manager'],
  },
  {
    id: 'when',
    title: 'When would you like to start?',
    options: ['This month', 'In a few months', 'Just exploring'],
  },
  {
    id: 'budget',
    title: 'Roughly what budget do you have in mind?',
    options: ['Under $5K', '$5K to $20K', 'Over $20K'],
  },
];

export default function QuestionDeckDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  if (result) {
    return (
      <View style={{ alignItems: 'center', gap: space[4], padding: space[6] }}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md, textAlign: 'center' }}>
          {result}
        </Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setResult(null);
            setRun((r) => r + 1);
          }}
        >
          Start over
        </PressJelly>
      </View>
    );
  }
  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
      <QuestionDeck
        key={run}
        questions={QUESTIONS}
        onClose={() => setResult('Closed')}
        onComplete={(answers) => setResult(Object.values(answers).join(' · '))}
      />
    </View>
  );
}
