// La deuxième étape de l'inscription et de la connexion : le code à six chiffres reçu par email.
// Sur un téléphone avec Face ID, Face ID est demandé juste après un bon code (voir AuthContext.verifyCode).
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { errorMessages, type Challenge } from "../api";
import { useAuth } from "../context/AuthContext";
import { styles } from "../screens/styles";

type Props = { challenge: Challenge; onBack: () => void };

// Un nouveau code peut être demandé toutes les 30 secondes (le backend l'impose aussi).
const RESEND_SECONDS = 30;

export default function CodeForm({ challenge, onBack }: Props) {
  const { verifyCode, resendCode, faceId } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      // En cas de succès, l'application bascule d'elle-même sur la liste des tâches.
      await verifyCode(challenge.email, code);
    } catch (err) {
      setError(errorMessages(err).join(" "));
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    try {
      await resendCode(challenge.email);
      setInfo("A new code is on its way.");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessages(err).join(" "));
    }
  }

  return (
    <View style={styles.authCard}>
      <Text style={styles.title}>HelloJess</Text>
      <Text style={styles.subtitle}>{challenge.purpose === "verify" ? "Verify your email" : "Two-step verification"}</Text>
      <Text style={styles.hint}>
        We sent a 6-digit code to {challenge.email}. It expires in 10 minutes.
        {faceId.enabled ? ` Then ${faceId.label} will confirm it is you.` : ""}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Text style={styles.success}>{info}</Text>}
      <Text style={styles.label}>Code</Text>
      <TextInput
        style={[styles.input, styles.codeInput]}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, ""))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
      />
      <TouchableOpacity
        style={[styles.button, (submitting || code.length !== 6) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || code.length !== 6}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{challenge.purpose === "verify" ? "Verify and continue" : "Log in"}</Text>
        )}
      </TouchableOpacity>
      <View style={styles.codeLinks}>
        <TouchableOpacity onPress={handleResend} disabled={wait > 0}>
          <Text style={[styles.linkText, wait > 0 && styles.linkTextDisabled]}>
            {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.linkText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
