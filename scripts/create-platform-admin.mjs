// Creates the PLATFORM_ADMIN login (not part of seed.ts, so the password
// never lives in the repo). Usage:
//   node scripts/create-platform-admin.mjs <email> <password>
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/create-platform-admin.mjs <email> <password>");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`${email} already exists — nothing to do.`);
  } else {
    await db.user.create({
      data: {
        email,
        name: "Platform Admin",
        role: "PLATFORM_ADMIN",
        passwordHash: await bcrypt.hash(password, 10),
        organizationId: null,
        branchId: null,
      },
    });
    console.log(`Created platform admin ${email}.`);
  }
} finally {
  await db.$disconnect();
}
