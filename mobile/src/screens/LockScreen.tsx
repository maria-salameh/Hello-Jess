// L'écran de verrouillage : une session est sauvegardée, mais Face ID doit d'abord confirmer que c'est le propriétaire.
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { styles } from "./styles";

export default function LockScreen() {
  const { unlock, logout, faceId } = useAuth();
  const [failed, setFailed] = useState(false);

  async function handleUnlock() {
    setFailed(false);
    if (!(await unlock())) setFailed(true);
  }

  return (
    <View style={styles.authPage}>
      <View style={styles.authCard}>
        <Text style={styles.title}>HelloJess</Text>
        <Text style={styles.subtitle}>Locked</Text>
        <Text style={styles.hint}>Use {faceId.label} to open the app.</Text>
        {failed && <Text style={styles.error}>{faceId.label} did not recognise you. Try again.</Text>}
        <TouchableOpacity style={styles.button} onPress={handleUnlock}>
          <Text style={styles.buttonText}>Unlock with {faceId.label}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.switchText}>Log out instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
