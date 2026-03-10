import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JUPA Digital',
    short_name: 'JUPA',
    description: 'Evaluaciones de lectura con soporte offline para escuelas y zonas sin conectividad.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4fbff',
    theme_color: '#0f766e',
    orientation: 'portrait',
    lang: 'es',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
