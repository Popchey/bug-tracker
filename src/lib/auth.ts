import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dbConnect from "./mongodb";
import User from "@/models/User";
import { rateLimit } from "./rateLimit";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                if (!rateLimit(`login:${credentials.email}`, 10, 15 * 60 * 1000)) return null;

                await dbConnect();
                const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean() as {
                    _id: mongoose.Types.ObjectId;
                    email: string;
                    password: string;
                } | null;
                if (!user) return null;

                const passwordMatch = await bcrypt.compare(credentials.password, user.password);
                if (!passwordMatch) return null;

                return { id: user._id.toString(), email: user.email };
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user?.id) token.id = user.id;
            return token;
        },
        session: async ({ session, token }) => {
            if (token.id) session.user.id = token.id;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
