/**
 * Smart email click handler to open Gmail app or web composer.
 */
export function handleEmailClick(e: React.MouseEvent<HTMLAnchorElement> | MouseEvent, email: string) {
  e.preventDefault();

  if (typeof window === "undefined") return;

  const userAgent = window.navigator.userAgent || window.navigator.vendor || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  if (isMobile) {
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    if (isIOS) {
      // Try iOS Gmail app scheme first
      window.location.href = `googlegmail:///co?to=${email}`;

      // Fallback to mailto if Gmail app is not installed
      const start = Date.now();
      setTimeout(() => {
        if (Date.now() - start < 1000) {
          window.location.href = `mailto:${email}`;
        }
      }, 500);
    } else {
      // Android default mailto usually triggers Gmail
      window.location.href = `mailto:${email}`;
    }
  } else {
    // Desktop: Open Gmail web compose in a new tab
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, "_blank", "noopener,noreferrer");
  }
}

/**
 * Smart phone click handler to open Native Dialer.
 */
export function handlePhoneClick(e: React.MouseEvent<HTMLAnchorElement> | MouseEvent, phone: string) {
  e.preventDefault();
  if (typeof window === "undefined") return;
  // Clean phone number to digits plus optional leading plus
  const cleaned = phone.replace(/[^\d+]/g, "");
  window.location.href = `tel:${cleaned}`;
}
