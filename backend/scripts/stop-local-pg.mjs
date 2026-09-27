import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import path from 'path';

const databaseDir = path.join(process.cwd(), '.local-pg');
const port = Number(process.env.PGPORT ?? 5432);
const user = 'bay3ly';
const password = 'bay3ly';

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: true,
  });

  try {
    await pg.stop();
    console.log(`Stopped embedded PostgreSQL on localhost:${port}`);
  } catch (error) {
    console.error('Could not stop via embedded-postgres:', error?.message ?? error);
    process.exitCode = 1;
  }

  const pidFile = path.join(databaseDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
    console.log('Removed postmaster.pid');
  }
}

main();
