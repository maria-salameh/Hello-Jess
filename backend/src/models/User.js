import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    hashed_password: { type: String, required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.hashed_password;
        return ret;
      },
    },
  }
);

export const User = mongoose.model("User", userSchema);
