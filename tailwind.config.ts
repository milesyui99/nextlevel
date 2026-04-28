// Tailwind v4 uses CSS @theme for custom colors (see app/globals.css).
// This file is kept for reference — custom colors brand, surface, surface2, muted
// are defined via @theme in globals.css.
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
