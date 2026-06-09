import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phsindia.app',
  appName: 'PHS Cleaning Company',

  server: {
    url: 'https://phs-cleaning-company.vercel.app/',
    cleartext: false
  }
};

export default config;