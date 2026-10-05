// Un petit bouton arrondi (filtre, choix de statut ou de priorité). Il est coloré quand il est sélectionné,
// et peut afficher un petit compteur à droite (ex. le nombre de tâches "Doing").
import { Text, TouchableOpacity } from "react-native";
import { styles } from "../screens/styles";

type Props = { label: string; active: boolean; onPress: () => void; count?: number };

export default function Chip({ label, active, onPress, count }: Props) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count !== undefined && <Text style={styles.chipCount}>{count}</Text>}
    </TouchableOpacity>
  );
}
