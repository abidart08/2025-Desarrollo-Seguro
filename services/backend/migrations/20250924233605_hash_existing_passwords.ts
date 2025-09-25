import type { Knex } from "knex";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function up(knex: Knex): Promise<void> {
  // Obtener todos los usuarios con contraseñas en texto plano
  const users = await knex("users").select("id", "password");

  for (const user of users) {
    // Solo hashear si la contraseña no está ya hasheada (bcrypt hashes start with $2a$, $2b$, etc.)
    if (!user.password.startsWith("$2")) {
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      await knex("users")
        .where("id", user.id)
        .update({ password: hashedPassword });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // No es posible revertir el hash de contraseñas de forma segura
  // Esta migración es irreversible
  throw new Error("Cannot reverse password hashing migration");
}
