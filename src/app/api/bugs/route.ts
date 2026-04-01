//   What this does:
//   - GET — fetches all bugs for the logged-in user, newest first
//   - POST — creates a new bug owned by the logged-in user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const bugs = await Bug.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(bugs);
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const bug = await Bug.create({ ...body, userId: session.user.id });
    return NextResponse.json(bug.toObject(), { status: 201 });
}
