import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    password: string;
    username?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        username: { type: String, trim: true },
        avatar: { type: String },
    },
    { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
    delete (mongoose.models as Record<string, unknown>).User;
}

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
