import { useState } from 'react';
import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SegmentBar } from './segment-bar';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

export default function SegmentBarDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [background, setBackground] = useState<'hidden' | 'visible'>('hidden');
  const [format, setFormat] = useState<'png' | 'jpg' | 'heic'>('png');
  const [saved, setSaved] = useState<string | null>(null);
  const title = (text: string, note?: string | null) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
      >
        {text}
      </Text>
      {note ? (
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{note}</Text>
      ) : null}
    </View>
  );
  return (
    <View style={{ gap: space[3], width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      {title('Background erase')}
      <SegmentBar
        label="Background"
        options={[
          { value: 'hidden', label: 'hidden' },
          { value: 'visible', label: 'visible' },
        ]}
        value={background}
        onChange={setBackground}
        action={{
          icon: <DemoIcon name="eraser" color={colors.text} size={22} />,
          label: 'Erase background',
          onPress: () => setBackground('hidden'),
        }}
        haptics={haptics}
        disabled={disabled}
      />
      <View style={{ height: space[3] }} />
      {title('Save', saved)}
      <SegmentBar
        label="File format"
        options={[
          { value: 'png', label: 'png' },
          { value: 'jpg', label: 'jpg' },
          { value: 'heic', label: 'heic' },
        ]}
        value={format}
        onChange={(f) => {
          setFormat(f);
          setSaved(null);
        }}
        action={{
          icon: <DemoIcon name="download" color={colors.text} size={22} />,
          label: 'Save image',
          onPress: () => setSaved(`Saved as .${format}`),
        }}
        haptics={haptics}
        disabled={disabled}
      />
    </View>
  );
}
