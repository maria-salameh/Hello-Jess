// La collection "habits" (bonus B2) : une habitude récurrente que l'utilisateur veut suivre,
// par exemple "Boire de l'eau". C'est une entité à part : ce n'est pas une tâche ponctuelle.
// Les jours où elle est réalisée sont enregistrés dans la collection "habitevents" (voir HabitEvent.js).
import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    // L'utilisateur à qui appartient l'habitude. Indexé pour retrouver vite ses habitudes.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Le nom de l'habitude : 1 à 100 caractères une fois les espaces retirés.
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    // Détails facultatifs, 0 à 500 caractères.
    description: { type: String, default: "", maxlength: 500 },
  },
  {
    // N'ajoute pas le champ interne de version "__v" de Mongoose aux documents.
    versionKey: false,
    // Remplit "createdAt" à la création et met à jour "updatedAt" à chaque modification.
    timestamps: true,
    // Définit l'aspect d'une habitude quand elle est envoyée en JSON aux applications.
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

// Le modèle est ce que le reste du code utilise pour créer et chercher des habitudes.
export const Habit = mongoose.model("Habit", habitSchema);
