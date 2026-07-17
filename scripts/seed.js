// Seed demo accounts. Run: bun run scripts/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Inline AES-256-GCM so we don't have to fight TS config importing the .ts file.
const crypto = require("crypto");
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
function getKey() {
  const secret = process.env.ENCRYPTION_SECRET || "gomen-dev-fallback-key-please-set-ENCRYPTION_SECRET-in-production-32b";
  return crypto.createHash("sha256").update(secret).digest();
}
function encryptPassword(plaintext) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

const SEED = [
  {
    username: "neon_kai",
    previousPassword: "OldPass_2022!",
    currentPassword: "V0rteX_99_secure",
    price: 49,
    category: "social",
    notes: "Premium social handle, 12k followers.",
  },
  {
    username: "shadow.rider",
    previousPassword: "shadow@2021",
    currentPassword: "Ph4ntom_R1der_X9",
    price: 99,
    category: "gaming",
    notes: "Steam + Epic linked. Verified email.",
  },
  {
    username: "lunar_dev",
    previousPassword: "moonDev#2020",
    currentPassword: "Ecl1pse_C0de_42_Lab",
    price: 149,
    category: "developer",
    notes: "GitHub Pro + Vercel team. High value.",
  },
  {
    username: "pixel.wave",
    previousPassword: "pixel2023!",
    currentPassword: "Quantum_P1xel_77",
    price: 79,
    category: "design",
    notes: "Behance + Dribbble portfolio.",
  },
  {
    username: "aurora_code",
    previousPassword: "aurora@2019",
    currentPassword: "Bore4l1s_Secret_K3y",
    price: 129,
    category: "developer",
    notes: "GitLab + Bitbucket admin.",
  },
  {
    username: "crimson.hawk",
    previousPassword: "hawkEye#2022",
    currentPassword: "T4lon_Str1ke_Predator",
    price: 89,
    category: "gaming",
    notes: "Riot + Battle.net accounts.",
  },
];

async function main() {
  for (const s of SEED) {
    await prisma.account.upsert({
      where: { username: s.username },
      update: {},
      create: {
        username: s.username,
        previousPassword: s.previousPassword,
        currentPasswordEnc: encryptPassword(s.currentPassword),
        price: s.price,
        category: s.category,
        notes: s.notes,
        status: "active",
      },
    });
  }
  console.log(`Seeded ${SEED.length} accounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
