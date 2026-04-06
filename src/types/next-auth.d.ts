import "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        username?: string | null;
    }
    interface Session {
        user: {
            id: string;
            email?: string | null;
            username?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        username?: string | null;
    }
}
