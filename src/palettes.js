export function orbGradient(hue, chroma, l) {
  return `radial-gradient(circle at 35% 28%, oklch(${Math.min(l + 16, 95)}% ${chroma * 0.55} ${hue}) 0%, oklch(${l}% ${chroma} ${hue}) 55%, oklch(${l - 20}% ${chroma * 0.9} ${hue}) 100%)`;
}

export const MOODS = [
  { v: 1, label: 'Low', hue: 250, chroma: 0.08, l: 68 },
  { v: 2, label: 'Down', hue: 300, chroma: 0.05, l: 68 },
  { v: 3, label: 'Okay', hue: 50, chroma: 0.015, l: 68 },
  { v: 4, label: 'Good', hue: 55, chroma: 0.09, l: 72 },
  { v: 5, label: 'Great', hue: 30, chroma: 0.12, l: 72 },
];

export const TAGS = ['Sleep', 'Work', 'Social', 'Exercise', 'Family'];

export const PALETTES = {
  cream: {
    label: 'Cream',
    swatch: 'oklch(74% 0.14 75)',
    page: 'oklch(93% 0.012 80)', bg: 'oklch(97% 0.01 80)',
    surface: 'oklch(93% 0.014 75)', surface2: 'oklch(89% 0.016 75)', border: 'oklch(80% 0.016 70)',
    text: 'oklch(24% 0.012 60)', textDim: 'oklch(45% 0.016 60)', textFaint: 'oklch(58% 0.014 60)',
    accentPrimary: 'oklch(66% 0.14 55)', accentPrimarySoft: 'oklch(66% 0.14 55 / 0.4)', onAccentText: 'oklch(99% 0.005 80)',
    saveFade: 'linear-gradient(to top, oklch(97% 0.01 80) 60%, transparent)',
    emptyOrb: 'radial-gradient(circle at 35% 30%, oklch(85% 0.05 75) 0%, oklch(90% 0.02 75) 70%)',
    insightBg: 'linear-gradient(145deg, oklch(88% 0.08 75), oklch(84% 0.07 45))',
    insightShadow: '0 0 0 1px oklch(70% 0.1 60 / 0.3), 0 12px 30px oklch(70% 0.1 60 / 0.25)',
    insightOrb: 'radial-gradient(circle at 35% 30%, oklch(96% 0.05 85) 0%, oklch(70% 0.14 55) 70%)',
    insightText: 'oklch(24% 0.012 60)', insightBody: 'oklch(38% 0.02 55)',
    heatHue: 65,
  },
};
