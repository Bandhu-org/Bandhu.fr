export const PIN_COLORS = [
  { name: 'Jaune', value: 'yellow', from: 'from-yellow-400', via: 'via-yellow-500', to: 'to-yellow-600', glow: 'rgba(250,204,21,0.6)' },
  { name: 'Rose', value: 'pink', from: 'from-pink-400', via: 'via-pink-500', to: 'to-pink-600', glow: 'rgba(236,72,153,0.6)' },
  { name: 'Bleu', value: 'blue', from: 'from-blue-400', via: 'via-blue-500', to: 'to-blue-600', glow: 'rgba(59,130,246,0.6)' },
  { name: 'Vert', value: 'green', from: 'from-green-400', via: 'via-green-500', to: 'to-green-600', glow: 'rgba(34,197,94,0.6)' },
  { name: 'Violet', value: 'purple', from: 'from-purple-400', via: 'via-purple-500', to: 'to-purple-600', glow: 'rgba(168,85,247,0.6)' },
  { name: 'Rouge', value: 'red', from: 'from-red-400', via: 'via-red-500', to: 'to-red-600', glow: 'rgba(239,68,68,0.6)' },
  { name: 'Orange', value: 'orange', from: 'from-orange-400', via: 'via-orange-500', to: 'to-orange-600', glow: 'rgba(249,115,22,0.6)' },
  { name: 'Cyan', value: 'cyan', from: 'from-cyan-400', via: 'via-cyan-500', to: 'to-cyan-600', glow: 'rgba(6,182,212,0.6)' },
  { name: 'Indigo', value: 'indigo', from: 'from-indigo-400', via: 'via-indigo-500', to: 'to-indigo-600', glow: 'rgba(99,102,241,0.6)' },
  { name: 'Lime', value: 'lime', from: 'from-lime-400', via: 'via-lime-500', to: 'to-lime-600', glow: 'rgba(132,204,22,0.6)' },
] as const

export function getPinColor(colorValue: string) {
  return PIN_COLORS.find(c => c.value === colorValue) || PIN_COLORS[0]
}