import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ollyverse.com',
  i18n: {
    locales: ['en', 'sk'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false }, // en at /, sk at /sk/
  },
});
