import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { DriftMarquee } from './drift-marquee';

describe('DriftMarquee', () => {
  it('reads each item once, however many copies fill the loop', async () => {
    await render(
      <View testID="host">
        <DriftMarquee itemWidth={100} speed={0}>
          <Text>Monet</Text>
          <Text>Seurat</Text>
        </DriftMarquee>
      </View>,
    );
    const row = screen.getByTestId('host').children[0];
    await act(async () => {
      fireEvent(row as never, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 180 } },
      });
    });
    expect(screen.getAllByText('Monet', { includeHiddenElements: true }).length).toBeGreaterThan(1);
    expect(screen.getAllByText('Monet')).toHaveLength(1);
    expect(screen.getAllByText('Seurat')).toHaveLength(1);
  });
});
