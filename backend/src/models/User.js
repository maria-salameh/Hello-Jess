// La collection "users" dans MongoDB : un document par compte créé.
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Identifiant de connexion. "unique" fait refuser par MongoDB un second compte avec le même email.
    email: { type: String, required: true, unique: true },
    // Nom affiché dans l'application ("Hi <nom>").
    name: { type: String, required: true },
    // Hash bcrypt du mot de passe. Le vrai mot de passe n'est jamais stocké.
    hashed_password: { type: String, required: true },
  },
  {
    // N'ajoute pas le champ interne de version "__v" de Mongoose aux documents.
    versionKey: false,
    // Remplit "created_at" automatiquement à la création (pas besoin de "updated_at").
    timestamps: { createdAt: "created_at", updatedAt: false },
    // Définit l'aspect d'un utilisateur quand il est envoyé en JSON aux applications web et mobile.
    toJSON: {
      transform(_doc, ret) {
        // Expose le "_id" de MongoDB sous forme de chaîne simple "id", utilisée par les frontends.
        ret.id = ret._id.toString();
        delete ret._id;
        // N'envoie jamais le hash du mot de passe au client.
        delete ret.hashed_password;
        return ret;
      },
    },
  }
);

// Le modèle est ce que le reste du code utilise pour créer et chercher des utilisateurs.
export const User = mongoose.model("User", userSchema);
