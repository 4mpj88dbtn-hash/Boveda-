// Crea un usuario en la base LOCAL para probar la app en tu computadora.
// Uso: npm run db:usuario -- tu@correo.com "Una-Contrasena-Larga-123"
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const [email, password] = process.argv.slice(2);
const url = process.env.SUPABASE_URL ?? "";

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) {
  console.error("Este comando solo funciona con la base local (SUPABASE_URL=http://127.0.0.1:54321).");
  process.exit(1);
}
if (!email || !password) {
  console.error('Uso: npm run db:usuario -- tu@correo.com "Una-Contrasena-Larga-123"');
  process.exit(1);
}

const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error(`No se pudo crear el usuario: ${error.message}`);
  process.exit(1);
}
console.log(`Usuario creado: ${email}. Entra en http://localhost:3000/entrar y activa tu 2FA.`);
