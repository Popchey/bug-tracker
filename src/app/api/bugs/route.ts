//   What this does:
//   - GET — fetches all bugs from the database, newest first
//   - POST — creates a new bug from the data sent in the request
//   - dbConnect() makes sure we're connected to MongoDB before doing anything
//   - Next.js automatically maps src/app/api/bugs/route.ts to the URL /api/bugs

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bug from "@/models/Bug";

export async function GET() {
    await dbConnect();

    const bugs = await Bug.find({}).sort({ createdAt: -1 });

    return NextResponse.json(bugs);
}

export async function POST(request: NextRequest) {
    await dbConnect();

    const body = await request.json();

    const bug = await Bug.create(body);

    return NextResponse.json(bug, { status: 201 });
}