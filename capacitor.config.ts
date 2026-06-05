// import type { CapacitorConfig } from '@capacitor/cli';
//
// const config: CapacitorConfig = {
//   appId: 'com.phscompany.app',
//   appName: 'PHS Company',
//   webDir: 'public'
// };
//
// export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phsindia.app',
  appName: 'PHS',

  server: {
    url: 'https://phs-company.vercel.app',
    cleartext: false
  }
};

export default config;