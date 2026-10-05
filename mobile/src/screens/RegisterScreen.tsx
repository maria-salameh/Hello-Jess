// L'écran d'inscription : crée un compte. Ensuite, l'application bascule d'elle-même sur la liste des tâches.
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
import { errorMessages } from "../api";
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
  // Vaut true pendant l'envoi de la requête, pour désactiver le bouton et éviter les doubles envois.
  const [submitting, setSubmitting] = useState(false);

  // S'exécute quand on appuie sur le bouton "Sign up".
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(email, name, password);
    } catch (err) {
      // Affiche la vraie raison renvoyée par le backend (ex. "Email already registered") ou "serveur injoignable".
      setError(errorMessages(err).join(" "));
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
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
        </TouchableOpacity>
        {/* Lien vers l'écran de connexion pour ceux qui ont déjà un compte. */}
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.switchText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
