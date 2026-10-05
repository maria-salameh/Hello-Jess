// L'écran des statistiques : la heatmap d'activité (bonus B3) et le taux de complétion par période (bonus B4).
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api, errorMessages, type Completion, type Heatmap as HeatmapData, type HeatmapDay } from "../api";
import Chip from "../components/Chip";
import CompletionChart from "../components/CompletionChart";
import ErrorList from "../components/ErrorList";
import Heatmap from "../components/Heatmap";
import TopNav from "../components/TopNav";
import { deviceTimeZone, formatDate } from "../utils/dates";
import { styles } from "./styles";

export default function StatsScreen() {
  const navigation = useNavigation<any>();
  // Les données de la heatmap et du graphique, la période choisie pour le graphique et le jour touché dans la heatmap.
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // On envoie le fuseau horaire du téléphone : le backend en a besoin pour savoir à quel jour
  // appartient une tâche terminée (23h30 à Paris n'est pas le même jour qu'à New York).
  const tz = deviceTimeZone();

  // La heatmap : chargée à l'ouverture et à chaque retour sur l'écran (52 dernières semaines).
  useEffect(() => {
    const load = () =>
      api
        .get<HeatmapData>("/stats/heatmap", { params: { tz } })
        .then((res) => setHeatmap(res.data))
        .catch((err) => setErrors(errorMessages(err)));
    load();
    return navigation.addListener("focus", load);
  }, [navigation, tz]);

  // Le taux de complétion : rechargé quand on passe de la vue par semaine à la vue par mois.
  useEffect(() => {
    api
      .get<Completion>("/stats/completion", { params: { period, count: 12, tz } })
      .then((res) => setCompletion(res.data))
      .catch((err) => setErrors(errorMessages(err)));
  }, [period, tz]);

  // Quelques chiffres résumés, calculés à partir de la heatmap.
  const days = heatmap?.days ?? [];
  const totalCompletions = days.reduce((sum, day) => sum + day.total, 0);
  const activeDays = days.filter((day) => day.total > 0).length;
  const bestDay = days.reduce<HeatmapDay | undefined>((best, day) => (day.total > (best?.total ?? 0) ? day : best), undefined);

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollContent}>
      <TopNav subtitle="Your activity at a glance" />
      <ErrorList messages={errors} />

      {/* La heatmap : une case par jour sur les 52 dernières semaines ; toucher une case affiche son détail. */}
      <View style={styles.statsCard}>
        <Text style={styles.statsHeading}>Activity</Text>
        <Text style={styles.statsNote}>Tasks completed and habits done, per day (time zone: {tz}).</Text>
        {heatmap ? (
          <>
            <Heatmap days={heatmap.days} selected={selected?.date ?? null} onSelect={setSelected} />
            <Text style={styles.statsNote}>
              {selected
                ? `${formatDate(selected.date)}: ${selected.total} completion${selected.total === 1 ? "" : "s"} (${selected.tasks} task${selected.tasks === 1 ? "" : "s"}, ${selected.habits} habit${selected.habits === 1 ? "" : "s"})`
                : "Tap a day for details."}
            </Text>
            {/* Résumé de la période affichée. */}
            <View style={styles.statsSummary}>
              <View>
                <Text style={styles.statsSummaryValue}>{totalCompletions}</Text>
                <Text style={styles.statsSummaryLabel}>completions</Text>
              </View>
              <View>
                <Text style={styles.statsSummaryValue}>{activeDays}</Text>
                <Text style={styles.statsSummaryLabel}>active days</Text>
              </View>
              <View>
                <Text style={styles.statsSummaryValue}>{bestDay ? bestDay.total : 0}</Text>
                <Text style={styles.statsSummaryLabel}>{bestDay ? `best day (${formatDate(bestDay.date)})` : "best day"}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.emptyState}>Loading...</Text>
        )}
      </View>

      {/* Le taux de complétion par semaine ou par mois, avec son évolution. */}
      <View style={styles.statsCard}>
        <Text style={styles.statsHeading}>Completion rate</Text>
        <View style={styles.chipRow}>
          <Chip label="Weekly" active={period === "week"} onPress={() => setPeriod("week")} />
          <Chip label="Monthly" active={period === "month"} onPress={() => setPeriod("month")} />
        </View>
        <Text style={styles.statsNote}>
          Tasks completed in the period ÷ tasks in progress during it. The small number shows the change versus the previous period.
        </Text>
        {completion ? (
          <CompletionChart items={completion.items} period={completion.period} />
        ) : (
          <Text style={styles.emptyState}>Loading...</Text>
        )}
      </View>
    </ScrollView>
  );
}
