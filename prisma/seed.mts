import { prisma } from "./seeds/shared.mts";
import { runDemoSeed } from "./seeds/demo.mts";
import { runDevSeed } from "./seeds/dev.mts";

async function main() {
  const target = (process.argv[2] ?? "dev").toLowerCase();

  if (target === "demo") {
    await runDemoSeed();
    return;
  }

  if (target === "dev") {
    await runDevSeed();
    return;
  }

  throw new Error(`Unknown seed target: ${target}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
