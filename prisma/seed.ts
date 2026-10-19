import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@airavut.com").trim().toLowerCase();
  const passwordHash = (
    process.env.ADMIN_PASSWORD_HASH ||
    "scrypt$9tvOxQWmdWhE13HCake6zQ$u_Axqt28aalTyFcgqMXp7DlG4Fs_JFFoL_pJl36CVk_XfyXTXIac2t5pon2BZP6-AOkUjUBelOG3MOTx2GLEoQ"
  ).trim();

  console.log(`Seeding admin user: ${email}...`);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      name: "Administrator"
    },
    create: {
      email,
      passwordHash,
      name: "Administrator"
    }
  });

  console.log("Admin user seeded successfully:");
  console.log({
    id: user.id,
    email: user.email,
    name: user.name
  });
}

main()
  .catch((e) => {
    console.error("Failed to seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
