import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phsindia.app',
  appName: 'PHS Cleaning Company',

  server: {
    url: 'https://www.phscleaningcompany.com/',
    cleartext: false
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 0,
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
