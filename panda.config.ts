import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import green from '@park-ui/panda-preset/colors/green'
import slate from '@park-ui/panda-preset/colors/slate'

export default defineConfig({
  preflight: true,
  presets: [
    '@pandacss/dev/presets',
    createPreset({
      accentColor: green,
      grayColor: slate,
      radius: 'md',
    }),
  ],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  jsxFramework: 'react',
  outdir: 'styled-system',
})
