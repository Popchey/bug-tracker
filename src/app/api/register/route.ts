import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
    let email: string | undefined;
    let password: string | undefined;

    try {
        const body = await req.json();
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
        }
        ({ email, password } = body as { email?: string; password?: string });
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await dbConnect();

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        await User.create({ email: email.toLowerCase(), password: hashedPassword });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }
        throw error;
    }

    return NextResponse.json({ message: "Account created" }, { status: 201 });
}
