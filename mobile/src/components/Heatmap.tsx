// La heatmap façon GitHub (bonus B3) : une grille de petites cases, une par jour, dont la couleur
// dépend de l'activité (tâches terminées + habitudes réalisées). Les colonnes sont des semaines
// (du lundi au dimanche) et les jours sans activité sont aussi affichés (en gris).
// Sur téléphone il n'y a pas de survol : toucher une case la sélectionne et l'écran affiche son détail.
import { useRef } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { HeatmapDay } from "../api";
import { styles } from "../screens/styles";
import { dayOfMonth, monthShort } from "../utils/dates";

// Taille d'une case et espace entre deux cases, en pixels (doit correspondre à styles.heatmapCell / heatmapColumn).
const CELL = 12;
const GAP = 3;

// Les 5 couleurs, du jour sans activité (0) au jour le plus actif (4).
export const LEVEL_COLORS = ["#2a2832", "#3d3680", "#5546b8", "#6c5ce7", "#9d90ff"];

type Props = {
  days: HeatmapDay[];
  selected: string | null;
  onSelect: (day: HeatmapDay) => void;
};

export default function Heatmap({ days, selected, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  if (days.length === 0) return null;

  // Le premier jour tombe rarement un lundi : on ajoute des cases vides avant pour que chaque colonne commence un lundi.
  const firstWeekday = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = lundi
  const cells: (HeatmapDay | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Les étiquettes de mois sont placées au-dessus de la première colonne qui contient le 1er du mois
  // (et de la toute première colonne, pour savoir où l'on commence).
  const monthLabels: { column: number; label: string }[] = [];
  weeks.forEach((week, column) => {
    const firstDay = week.find((day) => day !== null);
    if (!firstDay) return;
    const monthStart = week.find((day) => day !== null && dayOfMonth(day.date) === 1);
    if (column === 0 || monthStart) monthLabels.push({ column, label: monthShort((monthStart ?? firstDay).date) });
  });

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.heatmapRow}>
        {/* Les noms des jours à gauche (un sur deux) : ils restent fixes pendant que la grille défile. */}
        <View style={styles.heatmapWeekdays}>
          {["Mon", "", "Wed", "", "Fri", "", ""].map((label, i) => (
            <Text key={i} style={styles.heatmapWeekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* La grille défile horizontalement ; au chargement on va tout à droite pour voir les semaines les plus récentes. */}
        <ScrollView
          horizontal
          ref={scrollRef}
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View>
            {/* Les noms de mois, positionnés au pixel près au-dessus des colonnes. */}
            <View style={[styles.heatmapMonths, { width: weeks.length * (CELL + GAP) }]}>
              {monthLabels.map(({ column, label }) => (
                <Text key={column} style={[styles.heatmapMonthLabel, { left: column * (CELL + GAP) }]}>
                  {label}
                </Text>
              ))}
            </View>
            {/* Une colonne par semaine ; chaque case est un bouton qui sélectionne le jour. */}
            <View style={{ flexDirection: "row", gap: GAP }}>
              {weeks.map((week, column) => (
                <View key={column} style={styles.heatmapColumn}>
                  {week.map((day, row) =>
                    day === null ? (
                      <View key={row} style={styles.heatmapCell} />
                    ) : (
                      <TouchableOpacity
                        key={day.date}
                        accessibilityLabel={`${day.date}: ${day.total} completions`}
                        onPress={() => onSelect(day)}
                        style={[
                          styles.heatmapCell,
                          { backgroundColor: LEVEL_COLORS[day.level] },
                          selected === day.date && styles.heatmapCellSelected,
                        ]}
                      />
                    )
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* La légende : du moins actif (gris) au plus actif (couleur pleine). */}
      <View style={styles.heatmapLegend}>
        <Text style={styles.statsNote}>Less</Text>
        {LEVEL_COLORS.map((color) => (
          <View key={color} style={[styles.heatmapCell, { backgroundColor: color }]} />
        ))}
        <Text style={styles.statsNote}>More</Text>
      </View>
    </View>
  );
}
