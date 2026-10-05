// L'écran du calendrier : un mois à la fois, avec les tâches et habitudes marquées par des points de couleur,
// et la liste détaillée du jour touché en dessous.
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { api, errorMessages, type CalendarEvent, type CalendarResponse } from "../api";
import Chip from "../components/Chip";
import ErrorList from "../components/ErrorList";
import TopNav from "../components/TopNav";
import { EVENT_COLORS, TYPE_LABEL, eventColor } from "../utils/calendar";
import {
  addDays,
  addMonths,
  dayOfMonth,
  deviceTimeZone,
  endOfMonth,
  endOfWeek,
  formatDate,
  monthYear,
  startOfMonth,
  startOfWeek,
  todayLocal,
} from "../utils/dates";
import { styles } from "./styles";

// Les jours de la semaine affichés en haut de la grille.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Combien de points de couleur on montre dans une case.
const MAX_DOTS = 6;

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const today = todayLocal();
  // Le mois affiché (son premier jour) et le jour touché.
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // La grille commence le lundi de la première semaine du mois et finit le dimanche de la dernière.
  const gridStart = startOfWeek(month);
  const gridEnd = endOfWeek(endOfMonth(month));
  const tz = deviceTimeZone();

  // Recharge les événements à l'ouverture, à chaque changement de mois et à chaque retour sur l'écran.
  // Le fuseau horaire sert au backend à savoir à quel jour appartient une tâche terminée.
  useEffect(() => {
    const load = () =>
      api
        .get<CalendarResponse>("/calendar", { params: { from: gridStart, to: gridEnd, tz } })
        .then((res) => {
          setEvents(res.data.events);
          setErrors([]);
        })
        .catch((err) => setErrors(errorMessages(err)));
    load();
    return navigation.addListener("focus", load);
  }, [navigation, gridStart, gridEnd, tz]);

  // Passe au mois précédent ou suivant, ou revient à aujourd'hui.
  function goToMonth(newMonth: string) {
    setMonth(newMonth);
    // On sélectionne le jour 1 du nouveau mois (ou aujourd'hui si c'est le mois courant).
    setSelected(startOfMonth(today) === newMonth ? today : newMonth);
  }

  // Tous les jours de la grille, découpés en semaines de 7.
  const days: string[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) days.push(day);
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const dayEvents = events.filter((event) => event.date === selected);

  return (
    <ScrollView style={styles.scrollPage} contentContainerStyle={styles.scrollContent}>
      <TopNav subtitle="Your tasks and habits by day" />
      <ErrorList messages={errors} />

      {/* La barre du mois : précédent, nom du mois, suivant et retour à aujourd'hui. */}
      <View style={styles.calToolbar}>
        <Chip label="‹" active={false} onPress={() => goToMonth(addMonths(month, -1))} />
        <Text style={styles.calTitle}>{monthYear(month)}</Text>
        <Chip label="›" active={false} onPress={() => goToMonth(addMonths(month, 1))} />
        <Chip label="Today" active={false} onPress={() => goToMonth(startOfMonth(today))} />
      </View>

      {/* La grille : les noms de jours, puis une ligne par semaine. Chaque case montre le numéro du jour
          et un point de couleur par événement ; toucher une case la sélectionne. */}
      <View>
        <View style={styles.calRow}>
          {WEEKDAYS.map((weekday) => (
            <Text key={weekday} style={styles.calWeekdayLabel}>
              {weekday}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0]} style={styles.calRow}>
            {week.map((day) => {
              const eventsOfDay = events.filter((event) => event.date === day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.calCell,
                    day.slice(0, 7) !== month.slice(0, 7) && styles.calCellOutside,
                    day === selected && styles.calCellSelected,
                  ]}
                  onPress={() => setSelected(day)}
                  accessibilityLabel={`${day}: ${eventsOfDay.length} events`}
                >
                  <Text style={[styles.calDayNumber, day === today && styles.calDayNumberToday]}>{dayOfMonth(day)}</Text>
                  <View style={styles.calDots}>
                    {eventsOfDay.slice(0, MAX_DOTS).map((event, index) => (
                      <View key={index} style={[styles.calDot, { backgroundColor: eventColor(event, today) }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* La légende des couleurs. */}
      <View style={styles.calLegend}>
        {(
          [
            ["Task due", EVENT_COLORS.due],
            ["Overdue", EVENT_COLORS.overdue],
            ["Task completed", EVENT_COLORS.done],
            ["Habit done", EVENT_COLORS.habit],
          ] as const
        ).map(([label, color]) => (
          <View key={label} style={styles.calLegendItem}>
            <View style={[styles.calDot, { backgroundColor: color }]} />
            <Text style={styles.statsNote}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Le détail du jour touché : chaque événement avec sa couleur ; les tâches ouvrent leur écran de détail. */}
      <View style={styles.statsCard}>
        <Text style={styles.statsHeading}>{formatDate(selected)}</Text>
        {dayEvents.length === 0 ? (
          <Text style={styles.statsNote}>Nothing on this day.</Text>
        ) : (
          dayEvents.map((event, index) => (
            <TouchableOpacity
              key={index}
              style={styles.calDayItem}
              onPress={() => (event.taskId ? navigation.navigate("TaskDetail", { id: event.taskId }) : navigation.navigate("Habits"))}
            >
              <View style={[styles.calDot, { backgroundColor: eventColor(event, today), marginTop: 5 }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{event.title}</Text>
                <Text style={styles.statsNote}>
                  {TYPE_LABEL[event.type]}
                  {event.priority && event.type === "task-due" ? ` · ${event.priority} priority` : ""}
                  {event.status === "doing" ? " · in progress" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
