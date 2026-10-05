// Le graphique du taux de complétion (bonus B4) : une barre par période (semaine ou mois), de la plus
// ancienne à la plus récente. La hauteur de la barre est le taux ; sans tâche en jeu, la période est vide ("–").
import type { CompletionItem } from "../api";
import { formatDate, monthShort } from "../utils/dates";

type Props = { items: CompletionItem[]; period: "week" | "month" };

// Le taux sous forme de pourcentage ("67 %"), ou "–" quand il n'y a rien à mesurer.
const percent = (rate: number | null) => (rate === null ? "–" : `${Math.round(rate * 100)}%`);

// L'évolution par rapport à la période précédente, en points de pourcentage ("+33 pts").
function formatChange(change: number | null): string {
  if (change === null) return "";
  const points = Math.round(change * 100);
  return `${points > 0 ? "+" : ""}${points} pts`;
}

export default function CompletionChart({ items, period }: Props) {
  return (
    <div className="completion-chart">
      {items.map((item) => {
        const label = period === "month" ? monthShort(item.start) : item.start.slice(5);
        const change = formatChange(item.change);
        return (
          <div
            key={item.start}
            className="completion-col"
            title={`${period === "month" ? "Month" : "Week"} of ${formatDate(item.start)}: ${item.completed} of ${item.workload} task${item.workload === 1 ? "" : "s"} completed (${percent(item.rate)})${change ? `, ${change} vs previous` : ""}; ${item.habitCompletions} habit completion${item.habitCompletions === 1 ? "" : "s"}`}
          >
            {/* Le pourcentage au-dessus de la barre, et l'évolution (verte si ça progresse, rouge sinon). */}
            <div className="completion-value">{percent(item.rate)}</div>
            <div className={`completion-change ${item.change !== null && item.change < 0 ? "down" : "up"}`}>{change}</div>
            {/* La barre : sa hauteur est proportionnelle au taux ; une barre grisée très basse signale "pas de données". */}
            <div className="completion-track">
              <div
                className={`completion-bar ${item.rate === null ? "empty" : ""}`}
                style={{ height: item.rate === null ? "4%" : `${Math.max(item.rate * 100, 2)}%` }}
              />
            </div>
            {/* Début de la période (jour/mois pour une semaine, nom du mois pour un mois). */}
            <div className="completion-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
