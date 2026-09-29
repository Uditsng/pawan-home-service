"use client";

import dynamic from "next/dynamic";

// MobileSetup wires up the Capacitor push / local-notification pipeline. It is
// only meaningful inside the native webview, but the root layout mounted it on
// every route, so its module graph (server-action stubs, notification channel
// maps, receipt parsing) was part of the shared client bundle that the public
// landing page also downloaded.
//
// `ssr: false` is required because MobileSetup is effect-only: it renders no
// markup, so skipping prerendering costs nothing visually and avoids a
// hydration mismatch. It still mounts on the first client tick, so native token
// registration and receipt listeners are unaffected.
const MobileSetup = dynamic(() => import("./MobileSetup"), { ssr: false });

export default function MobileSetupLoader() {
  return <MobileSetup />;
}
