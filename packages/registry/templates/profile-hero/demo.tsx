import { defineControls } from '../../demo-kit/types';
import { ProfileHero } from './profile-hero';

export const controls = defineControls({});

// Stands in for a network request so the skeletons are visible.
const loadTab = () => new Promise<void>((resolve) => setTimeout(resolve, 900));

export default function ProfileHeroDemo() {
  return <ProfileHero loadTab={loadTab} onMessage={() => {}} />;
}
