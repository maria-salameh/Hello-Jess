// Face ID (or the phone's fingerprint reader) through expo-local-authentication. The phone itself does the recognition:
// the app only learns "yes, it is the owner" or "no", and never sees the face data.
import * as LocalAuthentication from "expo-local-authentication";

export type Biometrics = { available: boolean; label: string };

// Whether this phone can do it right now: it has the hardware and the owner has enrolled a face or finger.
// Expo Go on iOS has no Face ID, so there this is simply "not available" and the step is skipped.
export async function readBiometrics(): Promise<Biometrics> {
  try {
    const available = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!available) return { available: false, label: "Face ID" };
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    return { available: true, label: face ? "Face ID" : "Fingerprint" };
  } catch {
    return { available: false, label: "Face ID" };
  }
}

// Shows the system prompt. The phone's passcode is offered as a fallback so a failing sensor cannot lock the owner out.
export async function authenticate(reason: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Cancel" });
    return result.success;
  } catch {
    return false;
  }
}
