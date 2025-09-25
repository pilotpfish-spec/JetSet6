// lib/db.ts
export async function getDb() {
  const mod = await import("./prisma");
  return (mod as any).prisma ?? (mod as any).default;
}
