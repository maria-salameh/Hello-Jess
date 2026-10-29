// L'écran de connexion : un formulaire email/mot de passe. Après la connexion, l'application bascule d'elle-même sur la liste des tâches.
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { errorMessages, type Challenge } from "../api";
import Button from "../components/Button";
import FadeIn from "../components/FadeIn";
import CodeForm from "../components/CodeForm";
import { useAuth } from "../context/AuthContext";
import { styles } from "./styles";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Message affiché au-dessus du formulaire quand la connexion échoue.
  const [error, setError] = useState<string | null>(null);
  // Le code envoyé par email, une fois la première étape réussie.
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);

  // S'exécute quand on appuie sur le bouton "Log in".
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      setChallenge(await login(email, password));
    } catch (err) {
      // Affiche la vraie raison renvoyée par le backend (ex. mauvais identifiants) ou "serveur injoignable".
      setError(errorMessages(err).join(" "));
    } finally {
      setSubmitting(false);
    }
  }

  // Une fois le mot de passe accepté, le backend envoie un code par email : deuxième étape.
  if (challenge) {
    return (
      <KeyboardAvoidingView style={styles.authPage} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <CodeForm challenge={challenge} onBack={() => setChallenge(null)} />
      </KeyboardAvoidingView>
    );
  }

  return (
    // Sur iOS, remonte le formulaire quand le clavier s'ouvre pour qu'il ne cache pas les champs.
    <KeyboardAvoidingView
      style={styles.authPage}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FadeIn style={styles.authCard}>
        <Text style={styles.title}>HelloJess</Text>
        <Text style={styles.subtitle}>Log in to your tasks</Text>
        {/* Affiché seulement quand il y a un message d'erreur. */}
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.label}>Password</Text>
        {/* secureTextEntry masque les caractères saisis. */}
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        {/* Le bouton affiche un indicateur de chargement pendant l'envoi. */}
        <Button label="Log in" onPress={handleSubmit} loading={submitting} />
        {/* Lien vers l'écran d'inscription pour ceux qui n'ont pas encore de compte. */}
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.switchText}>No account? Sign up</Text>
        </TouchableOpacity>
      </FadeIn>
    </KeyboardAvoidingView>
  );
}
