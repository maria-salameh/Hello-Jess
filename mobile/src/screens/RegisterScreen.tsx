// L'écran d'inscription : crée un compte. Ensuite, l'application bascule d'elle-même sur la liste des tâches.
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

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Message affiché au-dessus du formulaire quand l'inscription échoue.
  const [error, setError] = useState<string | null>(null);
  // Le code envoyé par email, une fois la première étape réussie.
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);

  // S'exécute quand on appuie sur le bouton "Sign up".
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      setChallenge(await register(email, name, password));
    } catch (err) {
      // Affiche la vraie raison renvoyée par le backend (ex. "Email already registered") ou "serveur injoignable".
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
        <Text style={styles.subtitle}>Create your account</Text>
        {/* Affiché seulement quand il y a un message d'erreur. */}
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
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
        <Button label="Sign up" onPress={handleSubmit} loading={submitting} />
        {/* Lien vers l'écran de connexion pour ceux qui ont déjà un compte. */}
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.switchText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </FadeIn>
    </KeyboardAvoidingView>
  );
}
