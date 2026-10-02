/**
 * Cria (ou repõe a senha de) a conta ADMIN inicial. Resolve o problema do hash bcrypt no seed.sql.
 *
 * Uso (funciona em Windows, macOS e Linux):
 *   npm run create-admin
 *     -> pergunta email, nome e senha (a senha não aparece no ecrã)
 *   npm run create-admin -- --email admin@empresa.ao --name "Administrador"
 *     -> só pergunta a senha
 */
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { z } from 'zod';
import { pool } from '../config/database';
import { hashPassword } from '../common/utils/password';
import { exec, queryOne } from '../common/utils/db';

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
    muted = hidden; // a pergunta já foi escrita; a resposta fica oculta
  });
}

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  name: z.string().trim().min(2, 'Nome demasiado curto').max(150),
  password: z.string().min(10, 'A senha deve ter pelo menos 10 caracteres').max(72, 'Máximo de 72 caracteres'),
});

async function main(): Promise<void> {
  const email = argValue('--email') ?? (await ask('Email do admin: '));
  const name = argValue('--name') ?? ((await ask('Nome [Administrador]: ')) || 'Administrador');
  const password = await ask('Senha (mín. 10 caracteres): ', true);

  const parsed = inputSchema.safeParse({ email, name, password });
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌', Object.values(parsed.error.flatten().fieldErrors).flat().join(' | '));
    process.exitCode = 1;
    return;
  }

  const data = parsed.data;
  const existing = await queryOne<{ id: number; role: string }>(
    'SELECT id, role FROM users WHERE email = ?',
    [data.email],
  );
  const passwordHash = await hashPassword(data.password);

  if (existing && existing.role !== 'ADMIN') {
    // eslint-disable-next-line no-console
    console.error(`❌ Já existe um utilizador ${existing.role} com este email. Use outro email.`);
    process.exitCode = 1;
    return;
  }

  if (existing) {
    await exec("UPDATE users SET password_hash = ?, name = ?, status = 'ACTIVE' WHERE id = ?", [
      passwordHash,
      data.name,
      existing.id,
    ]);
    // eslint-disable-next-line no-console
    console.log(`✅ Conta ADMIN existente atualizada (${data.email}).`);
  } else {
    await exec(
      "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')",
      [data.name, data.email, passwordHash],
    );
    // eslint-disable-next-line no-console
    console.log(`✅ Conta ADMIN criada (${data.email}).`);
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Falha:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
