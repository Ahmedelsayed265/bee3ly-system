import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import net from 'net';
import path from 'path';

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  const databaseDir = path.join(process.cwd(), '.local-pg');
  const alreadyInitialized = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
  const pidFile = path.join(databaseDir, 'postmaster.pid');
  const port = 5432;

  if (fs.existsSync(pidFile)) {
    const pid = Number(fs.readFileSync(pidFile, 'utf8').split('\n')[0]);
    let processAlive = false;
    if (Number.isFinite(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        processAlive = true;
      } catch {
        processAlive = false;
      }
    }

    const portOpen = await isPortOpen(port);
    if (processAlive && portOpen) {
      console.log(`Local PostgreSQL already running (pid ${pid}) on localhost:${port}`);
      console.log('Keep this terminal open while developing.');
      await new Promise(() => {});
      return;
    }

    fs.unlinkSync(pidFile);
    console.log('Removed stale postmaster.pid');
  }

  if (await isPortOpen(port)) {
    console.error(
      `Port ${port} is already in use by another process. Free it or change the Postgres port.`,
    );
    process.exit(1);
  }

  // Existing local clusters were initialised as bay3ly; keep that for
  // persistent data. Fresh installs still get the same credentials.
  const user = 'bay3ly';
  const password = 'bay3ly';
  const database = 'bay3ly';

  const pg = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: true,
    // Windows default locale is WIN1252; force UTF8 so Arabic text works.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  if (!alreadyInitialized) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(database);
    console.log(`Database ${database} created`);
  } catch {
    console.log(`Database ${database} already exists`);
  }

  console.log(
    `Local PostgreSQL running on localhost:${port} (user/password/db: ${user})`,
  );
  console.log('Keep this terminal open while developing. Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('\nStopping PostgreSQL...');
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
