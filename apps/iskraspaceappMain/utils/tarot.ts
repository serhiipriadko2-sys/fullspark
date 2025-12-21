export interface Rune {
  name: string;
  symbol: string;
  meaning: string;
}

export const ELDER_FUTHARK: Rune[] = [
  { name: 'Fehu', symbol: 'ᚠ', meaning: 'Cattle, Wealth, Abundance' },
  { name: 'Uruz', symbol: 'ᚢ', meaning: 'Aurochs, Strength, Health' },
  { name: 'Thurisaz', symbol: 'ᚦ', meaning: 'Giant, Thorn, Conflict' },
  { name: 'Ansuz', symbol: 'ᚨ', meaning: 'God, Mouth, Wisdom' },
  { name: 'Raidho', symbol: 'ᚱ', meaning: 'Wagon, Journey, Movement' },
  { name: 'Kenaz', symbol: 'ᚲ', meaning: 'Torch, Knowledge, Clarity' },
  { name: 'Gebo', symbol: 'ᚷ', meaning: 'Gift, Partnership, Generosity' },
  { name: 'Wunjo', symbol: 'ᚹ', meaning: 'Joy, Harmony, Success' },
  { name: 'Hagalaz', symbol: 'ᚺ', meaning: 'Hail, Disruption, Change' },
  { name: 'Nauthiz', symbol: 'ᚾ', meaning: 'Need, Constraint, Endurance' },
  { name: 'Isa', symbol: 'ᛁ', meaning: 'Ice, Standstill, Stagnation' },
  { name: 'Jera', symbol: 'ᛃ', meaning: 'Year, Harvest, Cycles' },
  { name: 'Eihwaz', symbol: 'ᛇ', meaning: 'Yew Tree, Defense, Endurance' },
  { name: 'Perthro', symbol: 'ᛈ', meaning: 'Lot Cup, Mystery, Fate' },
  { name: 'Algiz', symbol: 'ᛉ', meaning: 'Elk, Protection, Higher Self' },
  { name: 'Sowilo', symbol: 'ᛊ', meaning: 'Sun, Success, Vitality' },
  { name: 'Tiwaz', symbol: 'ᛏ', meaning: 'Tyr God, Justice, Sacrifice' },
  { name: 'Berkano', symbol: 'ᛒ', meaning: 'Birch, Growth, New Beginnings' },
  { name: 'Ehwaz', symbol: 'ᛖ', meaning: 'Horse, Movement, Partnership' },
  { name: 'Mannaz', symbol: 'ᛗ', meaning: 'Man, Humanity, Self' },
  { name: 'Laguz', symbol: 'ᛚ', meaning: 'Water, Flow, Intuition' },
  { name: 'Ingwaz', symbol: 'ᛜ', meaning: 'Ing God, Fertility, Internal Growth' },
  { name: 'Dagaz', symbol: 'ᛞ', meaning: 'Day, Breakthrough, Awakening' },
  { name: 'Othala', symbol: 'ᛟ', meaning: 'Inheritance, Home, Ancestry' },
];

export function drawRunes(count: number): Rune[] {
  const shuffled = [...ELDER_FUTHARK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
