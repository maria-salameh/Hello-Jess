// L'écran de connexion : un formulaire email/mot de passe. Après la connexion, l'application bascule d'elle-même sur la liste des tâches.
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { styles } from "./styles";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  // Ce que l'utilisateur a saisi jusqu'ici.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Message affiché au-dessus du formulaire quand la connexion échoue.
  const [error, setError] = useState<string | null>(null);
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);

  // S'exécute quand on appuie sur le bouton "Log in".
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Sur iOS, remonte le formulaire quand le clavier s'ouvre pour qu'il ne cache pas les champs.
    <KeyboardAvoidingView
      style={styles.authPage}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.authCard}>
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
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
        </TouchableOpacity>
        {/* Lien vers l'écran d'inscription pour ceux qui n'ont pas encore de compte. */}
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.switchText}>No account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
