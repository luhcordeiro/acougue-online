import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://acougue_user:acougue_password@localhost:3306/acougue_online";

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Inserir categorias
    console.log("📁 Inserindo categorias...");
    await connection.execute(`
      INSERT INTO categories (name, description) VALUES
      ('Carnes Bovinas', 'Cortes nobres e tradicionais de carne bovina'),
      ('Carnes Suínas', 'Cortes de porco frescos e selecionados'),
      ('Aves', 'Frango, chester e outras aves'),
      ('Carnes Especiais', 'Cortes premium e diferenciados')
      ON DUPLICATE KEY UPDATE name=name
    `);

    // Buscar IDs das categorias
    const [categoriesResult] = await connection.execute('SELECT id, name FROM categories');
    const categories = categoriesResult;
    
    const bovinaId = categories.find(c => c.name === 'Carnes Bovinas')?.id;
    const suinaId = categories.find(c => c.name === 'Carnes Suínas')?.id;
    const avesId = categories.find(c => c.name === 'Aves')?.id;
    const especialId = categories.find(c => c.name === 'Carnes Especiais')?.id;

    // Inserir produtos de exemplo
    console.log("🥩 Inserindo produtos...");
    await connection.execute(`
      INSERT INTO products (name, description, categoryId, pricePerKg, stockKg, available) VALUES
      ('Picanha', 'Corte nobre, macio e suculento, ideal para churrasco', ${bovinaId}, 8990, 15000, true),
      ('Alcatra', 'Carne magra e versátil, ótima para bifes e assados', ${bovinaId}, 5490, 20000, true),
      ('Maminha', 'Corte macio e saboroso, perfeito para grelhar', ${bovinaId}, 6990, 12000, true),
      ('Costela Bovina', 'Ideal para churrasco, muito saborosa', ${bovinaId}, 3990, 25000, true),
      ('Filé Mignon', 'O corte mais macio da carne bovina', ${bovinaId}, 9990, 8000, true),
      ('Costela Suína', 'Costela de porco temperada, ideal para assar', ${suinaId}, 2990, 18000, true),
      ('Lombo Suíno', 'Corte magro e macio de porco', ${suinaId}, 3490, 15000, true),
      ('Bacon', 'Bacon defumado em tiras', ${suinaId}, 4990, 10000, true),
      ('Frango Inteiro', 'Frango caipira fresco', ${avesId}, 1890, 30000, true),
      ('Peito de Frango', 'Filé de peito sem osso', ${avesId}, 2490, 25000, true),
      ('Coxa e Sobrecoxa', 'Corte suculento de frango', ${avesId}, 1690, 28000, true),
      ('Wagyu', 'Carne premium importada com marmoreio excepcional', ${especialId}, 29990, 3000, true)
      ON DUPLICATE KEY UPDATE name=name
    `);

    console.log("✅ Seed concluído com sucesso!");
    console.log(`   - ${categories.length} categorias inseridas`);
    console.log("   - 12 produtos de exemplo inseridos");
    
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
