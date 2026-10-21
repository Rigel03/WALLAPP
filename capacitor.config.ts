import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wallapp.app',
  appName: 'WallApp',
  webDir: 'dist',
  backgroundColor: '#0a0a0a',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SystemBars: {
      style: 'DARK', // light icons on the dark background
    },
  },
};

export default config;
