import { render, screen } from '@testing-library/react-native';

import { ModeCard } from '@/features/game-modes/ModeCard';
import { GAME_MODES } from '@/features/game-modes/registry';

describe('mode card', () => {
  it('shows modes that are not available yet as disabled "Bald" cards', async () => {
    const onPress = jest.fn();
    await render(
      <ModeCard mode={{ ...GAME_MODES['random-challenges'], status: 'coming-soon' }} onPress={onPress} />,
    );
    expect(screen.getByLabelText('Random Challenges – bald verfügbar')).toBeOnTheScreen();
    expect(screen.getByText('Bald')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('shows available modes as buttons with their card count', async () => {
    await render(<ModeCard mode={GAME_MODES['random-challenges']} questionCount={300} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: /^Random Challenges\./ })).toBeOnTheScreen();
    expect(screen.getByText(/300 Challenges/)).toBeOnTheScreen();
  });
});
