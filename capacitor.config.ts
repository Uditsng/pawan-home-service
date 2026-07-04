import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phsindia.app',
  appName: 'PHS Cleaning Company',

  server: {
    url: 'https://phs-cleaning-company.vercel.app/',
    cleartext: false
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: "#002261",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ["alert", "badge", "sound"]
    }
  }
};

export default config;

// import type { CapacitorConfig } from '@capacitor/cli';

// const config: CapacitorConfig = {
//   appId: 'com.phsindia.app',
//   appName: 'PHS Cleaning Company',

//   server: {
//     url: 'http://10.0.2.2:3000',
//     cleartext: true
//   },

//   plugins: {
//     SplashScreen: {
//       launchShowDuration: 2000,
//       launchAutoHide: true,
//       launchFadeOutDuration: 500,
//       backgroundColor: "#002261",
//       androidScaleType: "CENTER_CROP",
//       showSpinner: false
//     }
//   }
// };

// export default config;