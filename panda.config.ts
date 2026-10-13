import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import green from '@park-ui/panda-preset/colors/green'
import slate from '@park-ui/panda-preset/colors/slate'
import { verdantPreset } from '@sustainablewebsites/verdant-design'

const parkPreset = createPreset({
  accentColor: green,
  grayColor: slate,
  radius: 'md',
})
const parkTheme = parkPreset.theme?.extend ?? {}
const parkRecipes = Object.fromEntries(
  Object.entries(parkTheme.recipes ?? {}).filter(([name]) => name !== 'button')
)
const parkSlotRecipes = Object.fromEntries(
  Object.entries(parkTheme.slotRecipes ?? {}).filter(([name]) => name !== 'card')
)
const parkPresetWithoutOverlappingRecipes = {
  ...parkPreset,
  theme: {
    ...(parkPreset.theme ?? {}),
    extend: {
      ...parkTheme,
      recipes: parkRecipes,
      slotRecipes: parkSlotRecipes,
    },
  },
}

export default defineConfig({
  preflight: true,
  presets: ['@pandacss/dev/presets', parkPresetWithoutOverlappingRecipes, verdantPreset],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  jsxFramework: 'react',
  outdir: 'styled-system',
})
