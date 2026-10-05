// La collection "tasks" dans MongoDB : un document par tâche à faire.
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    // L'utilisateur à qui appartient la tâche (référence vers un document User). Indexé pour que
    // "toutes les tâches de cet utilisateur" soit rapide.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Ce qu'il y a à faire : 1 à 120 caractères une fois les espaces du début et de la fin retirés.
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    // Avancement : à faire, en cours ou terminée.
    status: { type: String, enum: ["todo", "doing", "done"], required: true },
    // Détails facultatifs, 0 à 1000 caractères (la chaîne vide est acceptée).
    description: { type: String, default: "", maxlength: 1000 },
    // Échéance facultative : un jour du calendrier "YYYY-MM-DD" (sans heure, donc sans fuseau), ou null.
    dueDate: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
    // Importance de la tâche (bonus B1) ; seules ces trois valeurs sont acceptées.
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    // Moment où la tâche est passée à "done" (null sinon). Rempli par le serveur ; sert à la heatmap et aux statistiques.
    completedAt: { type: Date, default: null },
  },
  {
    // N'ajoute pas le champ interne de version "__v" de Mongoose aux documents.
    versionKey: false,
    // Remplit "createdAt" à la création et met à jour "updatedAt" à chaque modification.
    timestamps: true,
    // Définit l'aspect d'une tâche quand elle est envoyée en JSON aux applications web et mobile.
    toJSON: {
      transform(_doc, ret) {
        // Expose le "_id" de MongoDB sous forme de chaîne simple "id", utilisée par les frontends.
        ret.id = ret._id.toString();
        delete ret._id;
        // Le propriétaire est une information interne ; les applications n'en ont pas besoin.
        delete ret.owner;
        return ret;
      },
    },
  }
);

// Le modèle est ce que le reste du code utilise pour créer et chercher des tâches.
export const Task = mongoose.model("Task", taskSchema);
