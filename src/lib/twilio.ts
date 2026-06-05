/**
 * Twilio Verify API helper — SERVER ONLY.
 * Uses raw fetch to avoid adding any npm dependency.
 * Never import this module from client-side code.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;

function getBasicAuth(): string {
  const credentials = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Normalise an Indian mobile number to E.164 format.
 * Accepts: 9876543210, +919876543210, 919876543210
 * Returns: +919876543210
 */
export function normaliseIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  throw new Error('Invalid Indian mobile number. Must be 10 digits.');
}

/**
 * Validates that a phone number looks like a valid Indian mobile.
 * Must be exactly 10 digits starting with 6-9.
 */
export function validateIndianPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').replace(/^91/, '');
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Sends an OTP to the given E.164 phone number via Twilio Verify.
 * Throws on network error or Twilio API error.
 */
export async function sendVerificationOtp(e164Phone: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error(
      'Twilio credentials are not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in .env.local'
    );
  }

  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const body = new URLSearchParams({ To: e164Phone, Channel: 'sms' });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
    throw new Error(errorData.message || `Twilio API error: ${res.status}`);
  }
}

/**
 * Verifies an OTP code for the given E.164 phone number via Twilio Verify.
 * Returns true if the code is correct and still valid, false otherwise.
 */
export async function verifyOtp(e164Phone: string, code: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('Twilio credentials are not configured.');
  }

  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
  const body = new URLSearchParams({ To: e164Phone, Code: code });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    // 404 from Twilio means the verification was not found / already expired
    return false;
  }

  const data = await res.json() as { status?: string };
  return data.status === 'approved';
}
