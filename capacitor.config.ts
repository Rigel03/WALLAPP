import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wallapp.app',
  appName: 'WallSync',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
