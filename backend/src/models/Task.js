// La collection "tasks" dans MongoDB : un document par tâche à faire.
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    // L'utilisateur à qui appartient la tâche (référence vers un document User). Indexé pour que
    // "toutes les tâches de cet utilisateur" soit rapide.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Ce qu'il y a à faire.
    title: { type: String, required: true },
    // Détails supplémentaires facultatifs.
    notes: { type: String, default: null },
    // Date limite facultative.
    due_date: { type: Date, default: null },
    // Importance de la tâche ; seules ces trois valeurs sont acceptées.
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    // Indique si la tâche a été cochée comme terminée.
    completed: { type: Boolean, default: false },
  },
  {
    // N'ajoute pas le champ interne de version "__v" de Mongoose aux documents.
    versionKey: false,
    // Remplit "created_at" à la création et met à jour "updated_at" à chaque modification.
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
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
