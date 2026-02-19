import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import green from '@park-ui/panda-preset/colors/green'
import sand from '@park-ui/panda-preset/colors/sand'

export default defineConfig({
  preflight: true,
  presets: [
    '@pandacss/dev/presets',
    createPreset({
      accentColor: green,
      grayColor: sand,
      radius: 'md',
    }),
  ],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  jsxFramework: 'react',
  outdir: 'styled-system',
})
