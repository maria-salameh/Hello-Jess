// Demande une confirmation avant une action destructrice (ex. supprimer une habitude et son historique).
// Sur téléphone on utilise la boîte de dialogue native ; dans le navigateur (Expo web), Alert ne fait rien,
// donc on utilise window.confirm.
import { Alert, Platform } from "react-native";

export function confirmAction(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert("Are you sure?", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
