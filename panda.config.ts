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
  // Park UI's preset defines `dark` as `.dark &`, which wins over Verdant's
  // media-query condition. Restore the media query so Verdant's dark tokens
  // follow the OS setting, matching its prefers-contrast dark overrides.
  conditions: { extend: { dark: '@media (prefers-color-scheme: dark)' } },
  presets: ['@pandacss/dev/presets', parkPresetWithoutOverlappingRecipes, verdantPreset],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  jsxFramework: 'react',
  outdir: 'styled-system',
})
