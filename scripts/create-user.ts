import "dotenv/config";
import { hashPassword } from "../server/_core/auth";
import * as db from "../server/db";

async function main() {
  const username = "user";
  const password = "123456";
  const existing = await db.getUserByUsername(username);
  if (existing) {
    console.log(`User '${username}' already exists (id=${existing.id}).`);
    return;
  }

  const { hash, salt } = hashPassword(password);
  const user = await db.createLocalUser({
    username,
    name: "user",
    email: null,
    passwordHash: hash,
    passwordSalt: salt,
  });

  if (!user) {
    throw new Error("Failed to create user");
  }

  console.log(`Created user '${username}' (id=${user.id}).`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
