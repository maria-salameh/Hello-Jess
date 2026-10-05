// La heatmap façon GitHub (bonus B3) : une grille de petites cases, une par jour, dont la couleur
// dépend de l'activité (tâches terminées + habitudes réalisées). Les colonnes sont des semaines
// (du lundi au dimanche) et les jours sans activité sont aussi affichés (en gris).
import { useEffect, useRef } from "react";
import type { HeatmapDay } from "../api";
import { dayOfMonth, formatDate, monthShort } from "../utils/dates";

// Taille d'une case et espace entre deux cases, en pixels (doit correspondre au CSS : .heatmap-cell et .heatmap-grid).
const CELL = 12;
const GAP = 3;

// Découpe une liste en morceaux de 7 (une colonne = une semaine).
function toWeeks(cells: (HeatmapDay | null)[]): (HeatmapDay | null)[][] {
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function Heatmap({ days }: { days: HeatmapDay[] }) {
  // Sur un petit écran la grille déborde et défile : on la fait défiler tout à droite pour montrer
  // d'abord les semaines les plus récentes (comme sur GitHub).
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [days]);

  if (days.length === 0) return null;

  // Le premier jour tombe rarement un lundi : on ajoute des cases vides avant pour que chaque colonne commence un lundi.
  const firstWeekday = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = lundi
  const cells: (HeatmapDay | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = toWeeks(cells);

  // Les étiquettes de mois sont placées au-dessus de la première colonne qui contient le 1er du mois
  // (et de la toute première colonne, pour savoir où l'on commence).
  const monthLabels: { column: number; label: string }[] = [];
  weeks.forEach((week, column) => {
    const firstDay = week.find((day) => day !== null);
    if (!firstDay) return;
    const startsMonth = week.some((day) => day !== null && dayOfMonth(day.date) === 1);
    if (column === 0 || startsMonth) {
      const reference = week.find((day) => day !== null && dayOfMonth(day.date) === 1) ?? firstDay;
      monthLabels.push({ column, label: monthShort(reference.date) });
    }
  });

  return (
    <div className="heatmap">
      {/* La zone qui défile horizontalement si la grille est plus large que l'écran. */}
      <div className="heatmap-scroll" ref={scrollRef}>
        <div className="heatmap-inner">
          {/* Les étiquettes de mois, positionnées au pixel près au-dessus des colonnes. */}
          <div className="heatmap-months" style={{ width: weeks.length * (CELL + GAP) }}>
            {monthLabels.map(({ column, label }) => (
              <span key={column} style={{ left: column * (CELL + GAP) }}>
                {label}
              </span>
            ))}
          </div>

          <div className="heatmap-body">
            {/* Les jours de la semaine à gauche (un sur deux, comme sur GitHub). */}
            <div className="heatmap-weekdays">
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
              <span />
            </div>

            {/* La grille : 7 lignes, une colonne par semaine ; chaque case a une infobulle avec le détail du jour. */}
            <div className="heatmap-grid" role="img" aria-label="Activity heatmap">
              {cells.map((day, index) =>
                day === null ? (
                  <div key={`empty-${index}`} className="heatmap-cell empty" />
                ) : (
                  <div
                    key={day.date}
                    className={`heatmap-cell level-${day.level}`}
                    title={`${formatDate(day.date)}: ${day.total} completion${day.total === 1 ? "" : "s"} (${day.tasks} task${day.tasks === 1 ? "" : "s"}, ${day.habits} habit${day.habits === 1 ? "" : "s"})`}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* La légende, en dehors de la zone qui défile pour rester toujours visible : du moins actif (gris) au plus actif. */}
      <div className="heatmap-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div key={level} className={`heatmap-cell level-${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
