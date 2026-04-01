import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    const existing = await Bug.findById(id).lean() as { userId?: string } | null;
    if (!existing) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }
    if (existing.userId && existing.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let text: string | undefined;
    try {
        const body = await request.json();
        ({ text } = body);
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

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
