//   What this does:
//   - GET /api/bugs/[id] — fetch a single bug by its ID
//   - PUT /api/bugs/[id] — update a bug
//   - DELETE /api/bugs/[id] — delete a bug
//   - The [id] folder name tells Next.js this is a dynamic route — the ID comes from the URL

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";


// GET a single bug
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();

    const { id } = await params;

    const bug = await Bug.findById(id);

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json(bug);
}

// PUT (update) a bug
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    const bug = await Bug.findByIdAndUpdate(id, body, { new: true });

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }
    
    return NextResponse.json(bug);
}

//DELETE a bug
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();

    const { id } = await params;
    const bug = await Bug.findByIdAndDelete(id);

    if (!bug) {
        return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bug deleted successfully" });
}