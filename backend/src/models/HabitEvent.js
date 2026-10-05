// La collection "habitevents" (bonus B2) : un document par jour où une habitude a été réalisée.
// Ce sont ces événements datés qui alimentent la heatmap et les statistiques.
import mongoose from "mongoose";

const habitEventSchema = new mongoose.Schema(
  {
    // L'utilisateur à qui appartient l'événement (copié ici pour filtrer vite sans passer par l'habitude).
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // L'habitude réalisée.
    habit: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },
    // Le jour de réalisation, au format "YYYY-MM-DD". C'est le jour du calendrier de l'utilisateur
    // (choisi par son application), donc il ne dépend d'aucun fuseau horaire.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  {
    // N'ajoute pas le champ interne de version "__v" de Mongoose aux documents.
    versionKey: false,
    // Remplit "createdAt" : l'instant précis où l'événement a été enregistré (pas de "updatedAt").
    timestamps: { createdAt: true, updatedAt: false },
    // Définit l'aspect d'un événement quand il est envoyé en JSON aux applications.
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        // Les références internes sont exposées sous forme de simples chaînes (ou masquées).
        ret.habit = ret.habit.toString();
        delete ret.owner;
        return ret;
      },
    },
  }
);

// Une habitude ne peut être réalisée qu'une seule fois par jour : enregistrer deux fois le même
// jour est refusé par MongoDB (et traité comme "déjà fait" par le service).
habitEventSchema.index({ habit: 1, date: 1 }, { unique: true });

// Le modèle est ce que le reste du code utilise pour créer et chercher des événements.
export const HabitEvent = mongoose.model("HabitEvent", habitEventSchema);
