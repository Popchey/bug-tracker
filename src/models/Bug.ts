//  What this does:
//   - Defines what a "Bug" looks like — title, description, status, priority
//   - timestamps: true automatically adds createdAt and updatedAt fields
//   - The last line prevents mongoose from creating the model twice during hot reloads

import mongoose, { Schema, Document } from "mongoose";

export interface IBug extends Document {
    title: string;
    description: string;
    status: "open" | "in-progress" | "closed";
    priority: "low" | "medium" | "high";
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

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
    },
    { timestamps: true }    
);

export default mongoose.models.Bug || mongoose.model<IBug>("Bug", BugSchema);
