import mongoose, { Schema, Document } from "mongoose";

interface IComment {
    text: string;
    createdAt: Date;
}

export interface IBug extends Document {
    title: string;
    description: string;
    status: "open" | "in-progress" | "closed";
    priority: "low" | "medium" | "high";
    dueDate?: Date;
    tags?: string[];
    comments?: IComment[];
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const BugSchema = new Schema<IBug>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: ["open", "in-progress", "closed"],
        default: "open",
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
    dueDate: { type: Date, required: false },
    tags: [{ type: String, trim: true, lowercase: true }],
    comments: [CommentSchema],
    userId: { type: String },
},
    { timestamps: true }
);

BugSchema.index({ userId: 1, createdAt: -1 });

// In development, always re-register the model so schema changes from hot reloads take effect.
// mongoose.models caches the old schema otherwise, causing new fields (like tags) to be silently dropped.
if (process.env.NODE_ENV !== "production" && mongoose.models.Bug) {
    delete (mongoose.models as Record<string, unknown>).Bug;
}

export default mongoose.models.Bug || mongoose.model<IBug>("Bug", BugSchema);
