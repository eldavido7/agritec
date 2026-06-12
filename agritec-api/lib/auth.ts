import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { reserveSequentialId } from "@/lib/id-sequence";

const authUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  isActive: true,
  emailVerifiedAt: true,
  lastActiveAt: true,
  createdAt: true,
  updatedAt: true,
  buyerProfile: {
    select: {
      id: true,
    },
  },
  sellerProfile: {
    select: {
      id: true,
      farmName: true,
      description: true,
      locationLabel: true,
      fullAddress: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      autoPayoutEnabled: true,
    },
  },
} satisfies Prisma.UserSelect;

type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

type BuyerSignupInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
};

type SellerSignupInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  farmName: string;
  description?: string | null;
  locationLabel?: string | null;
  fullAddress?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type AuthTokenPayload = {
  userId: string;
  role: UserRole;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function serializeAuthUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    buyerProfile: user.buyerProfile,
    sellerProfile: user.sellerProfile
      ? {
          ...user.sellerProfile,
          latitude: user.sellerProfile.latitude
            ? Number(user.sellerProfile.latitude)
            : null,
          longitude: user.sellerProfile.longitude
            ? Number(user.sellerProfile.longitude)
            : null,
        }
      : null,
  };
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (typeof decoded !== "object" || !decoded.userId || !decoded.role) {
      return null;
    }

    if (!Object.values(UserRole).includes(decoded.role as UserRole)) {
      return null;
    }

    return {
      userId: decoded.userId as string,
      role: decoded.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function findAuthUserByEmail(email: string, role?: UserRole) {
  return prisma.user.findFirst({
    where: {
      email: normalizeEmail(email),
      ...(role ? { role } : {}),
    },
    select: authUserSelect,
    orderBy: { createdAt: "asc" },
  });
}

async function findAuthUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: authUserSelect,
  });
}

export async function verifyUserCredentials({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role?: UserRole;
}) {
  const normalizedEmail = normalizeEmail(email);

  const users = await prisma.user.findMany({
    where: {
      email: normalizedEmail,
      ...(role ? { role } : {}),
    },
    select: {
      ...authUserSelect,
      passwordHash: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const user of users) {
    if (!user.isActive) {
      continue;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  return null;
}

export async function createBuyerAccount(input: BuyerSignupInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      role: UserRole.BUYER,
    },
  });
  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const userId = await reserveSequentialId(tx, "user");
    const buyerProfileId = await reserveSequentialId(tx, "buyer_profile");
    const cartId = await reserveSequentialId(tx, "cart");

    const createdUser = await tx.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        passwordHash,
        fullName: input.fullName.trim(),
        role: UserRole.BUYER,
        phone: input.phone?.trim() || null,
        buyerProfile: {
          create: {
            id: buyerProfileId,
          },
        },
      },
      select: authUserSelect,
    });

    if (!createdUser.buyerProfile) {
      throw new Error("BUYER_PROFILE_NOT_CREATED");
    }

    await tx.cart.create({
      data: {
        id: cartId,
        buyerId: createdUser.buyerProfile.id,
      },
    });

    return createdUser;
  });

  return user;
}

export async function createSellerAccount(input: SellerSignupInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      role: UserRole.SELLER,
    },
  });
  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const userId = await reserveSequentialId(tx, "user");
    const sellerProfileId = await reserveSequentialId(tx, "seller_profile");

    return tx.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        passwordHash,
        fullName: input.fullName.trim(),
        role: UserRole.SELLER,
        phone: input.phone?.trim() || null,
        sellerProfile: {
          create: {
            id: sellerProfileId,
            farmName: input.farmName.trim(),
            description: input.description?.trim() || null,
            locationLabel: input.locationLabel?.trim() || null,
            fullAddress: input.fullAddress?.trim() || null,
            city: input.city?.trim() || null,
            state: input.state?.trim() || null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
          },
        },
      },
      select: authUserSelect,
    });
  });
}

export async function createPasswordResetToken(email: string, role?: UserRole) {
  const normalizedEmail = normalizeEmail(email);
  const users = await prisma.user.findMany({
    where: {
      email: normalizedEmail,
      ...(role ? { role } : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const activeUsers = users.filter((user) => user.isActive);
  const user =
    role != null
      ? activeUsers.find((candidate) => candidate.role === role) ?? null
      : activeUsers.length == 1
      ? activeUsers[0]
      : null;

  if (!user) {
    return null;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      consumedAt: null,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    token: rawToken,
    expiresAt,
  };
}

export async function resetPasswordWithToken(args: {
  token: string;
  password: string;
}) {
  const tokenHash = hashResetToken(args.token);

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    !resetToken.user.isActive ||
    resetToken.consumedAt ||
    resetToken.expiresAt.getTime() < Date.now()
  ) {
    throw new Error("INVALID_RESET_TOKEN");
  }

  const passwordHash = await bcrypt.hash(args.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        lastActiveAt: new Date(),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        consumedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        id: { not: resetToken.id },
      },
    }),
  ]);

  return resetToken.user;
}

export async function getAuthenticatedUser(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  const user = await findAuthUserById(payload.userId);
  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser(
  request: Request,
  allowedRoles?: UserRole[],
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return user;
}




