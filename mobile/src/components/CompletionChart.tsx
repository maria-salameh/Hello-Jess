// Le graphique du taux de complétion (bonus B4) : une barre par période (semaine ou mois), de la plus
// ancienne à la plus récente. La hauteur de la barre est le taux ; sans tâche en jeu, la période est vide ("–").
import { ScrollView, Text, View } from "react-native";
import type { CompletionItem } from "../api";
import { styles } from "../screens/styles";
import { monthShort } from "../utils/dates";

type Props = { items: CompletionItem[]; period: "week" | "month" };

// Le taux sous forme de pourcentage ("67%"), ou "–" quand il n'y a rien à mesurer.
const percent = (rate: number | null) => (rate === null ? "–" : `${Math.round(rate * 100)}%`);

// L'évolution par rapport à la période précédente, en points de pourcentage ("+33 pts").
function formatChange(change: number | null): string {
  if (change === null) return "";
  const points = Math.round(change * 100);
  return `${points > 0 ? "+" : ""}${points} pts`;
}

export default function CompletionChart({ items, period }: Props) {
  return (
    // Le graphique défile horizontalement s'il y a plus de barres que la largeur de l'écran.
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chartRow}>
        {items.map((item) => {
          // Début de la période : jour/mois pour une semaine, nom du mois pour un mois.
          const label = period === "month" ? monthShort(item.start) : item.start.slice(5);
          const down = item.change !== null && item.change < 0;
          return (
            <View key={item.start} style={styles.chartCol}>
              {/* Le pourcentage au-dessus de la barre, et l'évolution (verte si ça progresse, rouge sinon). */}
              <Text style={styles.chartValue}>{percent(item.rate)}</Text>
              <Text style={[styles.chartChange, down ? styles.chartChangeDown : styles.chartChangeUp]}>
                {formatChange(item.change)}
              </Text>
              {/* La barre : sa hauteur est proportionnelle au taux ; une barre grisée très basse signale "pas de données". */}
              <View style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartBar,
                    item.rate === null && styles.chartBarEmpty,
                    { height: `${item.rate === null ? 4 : Math.max(item.rate * 100, 2)}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
