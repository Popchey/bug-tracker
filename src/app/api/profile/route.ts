import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const user = await User.findById(session.user.id).lean() as {
        email: string;
        username?: string;
        avatar?: string;
    } | null;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ email: user.email, username: user.username ?? null, avatar: user.avatar ?? null });
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
        currentPassword?: string;
        newEmail?: string;
        newPassword?: string;
        newUsername?: string;
        newAvatar?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { currentPassword, newEmail, newPassword, newUsername, newAvatar } = body;

    const needsPassword = !!(newEmail || newPassword);
    const noPasswordFields = newUsername !== undefined || newAvatar !== undefined;

    if (!needsPassword && !noPasswordFields) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if (newPassword && newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).lean() as {
        _id: mongoose.Types.ObjectId;
        email: string;
        password: string;
    } | null;

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only verify current password when changing email or password
    if (needsPassword) {
        if (!currentPassword) {
            return NextResponse.json({ error: "Current password is required to change email or password" }, { status: 400 });
        }
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
        }
    }

    const update: { email?: string; password?: string; username?: string; avatar?: string | null } = {};
    if (newEmail) update.email = newEmail.trim().toLowerCase();
    if (newPassword) update.password = await bcrypt.hash(newPassword, 12);
    if (newUsername !== undefined) update.username = newUsername.trim() || undefined;
    if (newAvatar !== undefined) update.avatar = newAvatar || null;

    try {
        await User.findByIdAndUpdate(session.user.id, update, { runValidators: true });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
            return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }
        throw error;
    }

    return NextResponse.json({ message: "Profile updated" });
}
