#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Bee3lyStack } from '../lib/bee3ly-stack';
import type { Bee3lyEnvName } from '../lib/environment-config';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') as Bee3lyEnvName | undefined;
if (envName !== 'dev' && envName !== 'prod') {
  throw new Error('Pass -c env=dev or -c env=prod');
}

const frontendUrl = app.node.tryGetContext('frontendUrl') as string | undefined;
if (!frontendUrl?.trim()) {
  throw new Error(
    'Pass -c frontendUrl=https://your-amplify-app.example.com (comma-separated if multiple origins)',
  );
}

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
if (!account || !region) {
  throw new Error(
    'Set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION (run `aws configure` or export env vars)',
  );
}

new Bee3lyStack(app, `Bee3ly-${envName}`, {
  envName,
  frontendUrl: frontendUrl.trim(),
  env: { account, region },
  description: `Bee3ly ${envName} — VPC, RDS, Redis, ECS (backend + AI)`,
});

app.synth();
