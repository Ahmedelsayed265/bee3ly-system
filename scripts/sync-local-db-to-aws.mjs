/**
 * Copy local Docker Postgres (docker-compose) into dev/prod RDS via one-off ECS task in VPC.
 *
 * Prerequisites:
 * - docker compose postgres running locally
 * - AWS CLI + stack deployed (DbSyncBucket, DbSyncTaskDef outputs)
 * - CDK deploy once after adding db sync resources
 *
 * Usage: node scripts/sync-local-db-to-aws.mjs [--env dev] [--stack Bee3ly-dev] [--yes]
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs() {
  const args = process.argv.slice(2);
  let env = 'dev';
  let stack = 'Bee3ly-dev';
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env') env = args[++i] ?? env;
    else if (args[i] === '--stack') stack = args[++i] ?? stack;
    else if (args[i] === '--yes' || args[i] === '-y') yes = true;
  }
  return { env, stack, yes };
}

function awsJson(cmd) {
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
  return JSON.parse(out || '{}');
}

function log(msg) {
  console.log(`[db-sync] ${msg}`);
}

function stackOutput(stackName, key) {
  const q = `Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]`;
  const out = execSync(
    `aws cloudformation describe-stacks --stack-name ${stackName} --query "${q}" --output text`,
    { encoding: 'utf8' },
  ).trim();
  if (!out || out === 'None') {
    throw new Error(`Missing stack output ${key}. Run CDK deploy for ${stackName} first.`);
  }
  return out;
}

function getDatabaseSecret(stackName) {
  const arn = stackOutput(stackName, 'DatabaseSecretArn');
  const secret = awsJson(`aws secretsmanager get-secret-value --secret-id ${arn}`);
  return JSON.parse(secret.SecretString);
}

const TRUNCATE_SQL = `
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  ) LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;
`;

async function main() {
  const { env, stack, yes } = parseArgs();
  const region =
    process.env.AWS_REGION ||
    process.env.CDK_DEFAULT_REGION ||
    execSync('aws configure get region', { encoding: 'utf8' }).trim();

  process.env.AWS_DEFAULT_REGION = region;

  log(`Target stack: ${stack} (${env})`);

  const bucket = stackOutput(stack, 'DbSyncBucketName');
  const taskDef = stackOutput(stack, 'DbSyncTaskDefinitionArn');
  const cluster = stackOutput(stack, 'EcsClusterName');
  const subnets = stackOutput(stack, 'PrivateSubnetIds');
  const securityGroup = stackOutput(stack, 'BackendSecurityGroupId');

  const db = getDatabaseSecret(stack);
  const host = db.host;
  const port = String(db.port ?? 5432);
  const user = db.username;
  const password = db.password;
  const database = db.dbname ?? 'bay3ly';

  log('Dumping local Postgres (docker compose)...');
  const dumpRaw = execSync(
    'docker exec bee3ly-postgres pg_dump -U bay3ly --data-only --exclude-table-data=_prisma_migrations bay3ly',
    { encoding: 'utf8', cwd: root },
  );

  const tmpDir = mkdtempSync(path.join(tmpdir(), 'bee3ly-db-sync-'));
  const sqlPath = path.join(tmpDir, 'import.sql');
  writeFileSync(sqlPath, `${TRUNCATE_SQL}\n${dumpRaw}`, 'utf8');

  const s3Key = `manual/${Date.now()}-local-import.sql`;
  const s3Uri = `s3://${bucket}/${s3Key}`;
  log(`Uploading to ${s3Uri} ...`);
  execSync(`aws s3 cp "${sqlPath}" "${s3Uri}"`, { stdio: 'inherit' });

  if (!yes) {
    log('This will REPLACE all application data in RDS (keeps _prisma_migrations).');
    log(`Host: ${host}  Database: ${database}`);
    log('Re-run with --yes to proceed.');
    rmSync(tmpDir, { recursive: true, force: true });
    process.exit(0);
  }

  const importShell =
    'set -e && apk add --no-cache aws-cli && export PGSSLMODE=require && aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" - | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1';

  const runTaskInput = {
    cluster,
    taskDefinition: taskDef,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: subnets.split(',').filter(Boolean),
        securityGroups: [securityGroup],
        assignPublicIp: 'DISABLED',
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: 'Import',
          command: ['sh', '-c', importShell],
          environment: [
            { name: 'PGHOST', value: host },
            { name: 'PGPORT', value: port },
            { name: 'PGUSER', value: user },
            { name: 'PGPASSWORD', value: password },
            { name: 'PGDATABASE', value: database },
            { name: 'S3_BUCKET', value: bucket },
            { name: 'S3_KEY', value: s3Key },
          ],
        },
      ],
    },
  };

  const runTaskPath = path.join(tmpDir, 'run-task.json');
  writeFileSync(runTaskPath, JSON.stringify(runTaskInput), 'utf8');
  const runTaskFile = runTaskPath.replace(/\\/g, '/');

  log('Starting ECS import task (private subnet → RDS)...');
  const run = awsJson(
    `aws ecs run-task --cli-input-json file://${runTaskFile}`,
  );

  const taskArn = run.tasks?.[0]?.taskArn;
  if (!taskArn) {
    console.error(run);
    throw new Error('ECS run-task did not return a task ARN');
  }

  log(`Task: ${taskArn}`);
  log('Waiting for task to stop...');
  execSync(`aws ecs wait tasks-stopped --cluster ${cluster} --tasks ${taskArn}`, {
    stdio: 'inherit',
  });

  const desc = awsJson(
    `aws ecs describe-tasks --cluster ${cluster} --tasks ${taskArn}`,
  );
  const container = desc.tasks?.[0]?.containers?.[0];
  const exitCode = container?.exitCode;
  if (exitCode !== 0) {
    log(`Import failed (exit ${exitCode}). Check CloudWatch: /bee3ly/${env}/db-sync`);
    process.exit(1);
  }

  rmSync(tmpDir, { recursive: true, force: true });
  log('Done — RDS now matches local data (schema unchanged).');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
