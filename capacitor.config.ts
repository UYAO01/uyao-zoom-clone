import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'ibr_zoom_clone',
  webDir: 'out',
  server: {
    url: process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: true,
  },
};

export default config;