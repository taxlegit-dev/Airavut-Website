import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@airavut.com").trim().toLowerCase();
  const passwordHash = (
    process.env.ADMIN_PASSWORD_HASH ||
    "scrypt:i_2pekqsv1XhqUPvW6zrHg:cwT6f55In2XUso7ZLIGEwpPpMUX2waFYoyC3FMiVvmc8y8cHtwyNim023RF463VecW85L0XCDWGFuV4--ET1TQ"
  ).trim();

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      name: "Administrator"
    }
  });

  console.log("Admin user bootstrapped in database:", {
    id: user.id,
    email: user.email,
    name: user.name
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
