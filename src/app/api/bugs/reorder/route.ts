import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

// PUT /api/bugs/reorder
// Body: { ids: string[] } — ordered array of bug IDs, index = new order value
export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { ids?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { ids } = body;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
        return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
    }

    await dbConnect();

    await Promise.all(
        (ids as string[]).map((id, index) =>
            Bug.updateOne(
                { _id: id, userId: session.user.id },
                { $set: { order: index } }
            )
        )
    );

    return NextResponse.json({ ok: true });
}
