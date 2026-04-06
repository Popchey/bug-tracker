import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
    const xff = req.headers.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0].trim() || "local" : "local";
    if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
        return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    let email: string | undefined;
    let password: string | undefined;
    let username: string | undefined;

    try {
        const body = await req.json();
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
        }
        ({ email, password, username } = body as { email?: string; password?: string; username?: string });
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
        await User.create({ email: email.toLowerCase(), password: hashedPassword, username: username?.trim() || undefined });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }
        throw error;
    }

    return NextResponse.json({ message: "Account created" }, { status: 201 });
}
