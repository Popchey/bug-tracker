import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();

    const { id } = await params;
    const { text } = await request.json();

    if (!text?.trim()) {
        return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const bug = await Bug.findByIdAndUpdate(
        id,
        { $push: { comments: { text: text.trim(), createdAt: new Date() } } },
        { new: true, runValidators: true }
    ).lean();

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json(bug);
}
