// La page des statistiques : la heatmap d'activité (bonus B3) et le taux de complétion par période (bonus B4).
import { useEffect, useState } from "react";
import { api, errorMessages, type Completion, type Heatmap as HeatmapData } from "../api";
import AppHeader from "../components/AppHeader";
import CompletionChart from "../components/CompletionChart";
import ErrorList from "../components/ErrorList";
import Heatmap from "../components/Heatmap";
import { browserTimeZone, formatDate } from "../utils/dates";

export default function Stats() {
  // Les données de la heatmap et du graphique, et la période choisie pour le graphique.
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [errors, setErrors] = useState<string[]>([]);

  // On envoie le fuseau horaire du navigateur : le backend en a besoin pour savoir à quel jour
  // appartient une tâche terminée (23h30 à Paris n'est pas le même jour qu'à New York).
  const tz = browserTimeZone();

  // La heatmap : chargée une fois (52 dernières semaines).
  useEffect(() => {
    api
      .get<HeatmapData>("/stats/heatmap", { params: { tz } })
      .then((res) => setHeatmap(res.data))
      .catch((err) => setErrors(errorMessages(err)));
  }, [tz]);

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
  const bestDay = days.reduce((best, day) => (day.total > (best?.total ?? 0) ? day : best), undefined as (typeof days)[number] | undefined);

  return (
    <div className="tasks-page stats-page">
      <AppHeader subtitle="Your activity at a glance" />
      <ErrorList messages={errors} />

      {/* La heatmap : une case par jour sur les 52 dernières semaines. */}
      <section className="stats-card">
        <h2>Activity</h2>
        <p className="stats-note">Tasks completed and habits done, per day (time zone: {tz}).</p>
        {heatmap ? (
          <>
            <Heatmap days={heatmap.days} />
            {/* Résumé de la période affichée. */}
            <div className="stats-summary">
              <div>
                <strong>{totalCompletions}</strong>
                <span>completions</span>
              </div>
              <div>
                <strong>{activeDays}</strong>
                <span>active days</span>
              </div>
              <div>
                <strong>{bestDay ? bestDay.total : 0}</strong>
                <span>{bestDay ? `best day (${formatDate(bestDay.date)})` : "best day"}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="empty-state">Loading...</p>
        )}
      </section>

      {/* Le taux de complétion par semaine ou par mois, avec son évolution. */}
      <section className="stats-card">
        <div className="stats-card-head">
          <h2>Completion rate</h2>
          <div className="chips">
            <button type="button" className={`chip ${period === "week" ? "active" : ""}`} onClick={() => setPeriod("week")}>
              Weekly
            </button>
            <button type="button" className={`chip ${period === "month" ? "active" : ""}`} onClick={() => setPeriod("month")}>
              Monthly
            </button>
          </div>
        </div>
        <p className="stats-note">
          Tasks completed in the period ÷ tasks in progress during it. The small number shows the change versus the previous period.
        </p>
        {completion ? <CompletionChart items={completion.items} period={completion.period} /> : <p className="empty-state">Loading...</p>}
      </section>
    </div>
  );
}
