import { drizzle } from "drizzle-orm/mysql2";
import { adminUsers } from "./drizzle/schema.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

// Criar usuário admin padrão
const username = "admin";
const password = "admin123";
const name = "Administrador";

async function createAdmin() {
  try {
    // Verificar se já existe
    const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    
    if (existing.length > 0) {
      console.log(`✓ Usuário '${username}' já existe`);
      return;
    }
    
    // Criar hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Inserir no banco
    await db.insert(adminUsers).values({
      username,
      passwordHash,
      name,
      active: true,
    });
    
    console.log(`✓ Usuário admin criado com sucesso!`);
    console.log(`  Username: ${username}`);
    console.log(`  Senha: ${password}`);
    console.log(`  IMPORTANTE: Altere a senha após o primeiro login!`);
  } catch (error) {
    console.error("Erro ao criar usuário admin:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

createAdmin();
