import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'ibr_zoom_clone',
  webDir: 'out', // Next.js bado inahitaji folder hili liwepo hata kama halitumiki sana sasa
  server: {
    // WEKA IP ADDRESS YAKO HAPA (Badilisha 192.168.1.XX kuwa IP uliyoipata kwenye CMD)
    url: ' http://192.168.1.100:3000', // Badilisha port 3000 ikiwa unatumia port nyingine
    cleartext: true,
  },
};

export default config;