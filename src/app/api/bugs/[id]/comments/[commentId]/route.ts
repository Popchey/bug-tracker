import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id, commentId } = await params;

    const existing = await Bug.findById(id).lean() as { userId?: string } | null;
    if (!existing) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }
    if (existing.userId && existing.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bug = await Bug.findByIdAndUpdate(
        id,
        { $pull: { comments: { _id: commentId } } },
        { new: true }
    ).lean();

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json(bug);
}
