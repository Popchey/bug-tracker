//   What this does:
//   - GET /api/bugs/[id] — fetch a single bug by its ID
//   - PUT /api/bugs/[id] — update a bug (owner only)
//   - DELETE /api/bugs/[id] — delete a bug (owner only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const bug = await Bug.findById(id).lean();

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json(bug);
}

export async function PUT(
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

    const body = await request.json();
    const { title, description, status, priority, dueDate, tags } = body;
    const update = { title, description, status, priority, dueDate, tags };

    const bug = await Bug.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    return NextResponse.json(bug);
}

export async function DELETE(
    _request: NextRequest,
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

    await Bug.findByIdAndDelete(id);
    return NextResponse.json({ message: "Bug deleted successfully" });
}
