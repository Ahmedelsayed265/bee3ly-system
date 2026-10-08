import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import {
  Bee3lyEnvName,
  getBee3lyEnvConfig,
} from './environment-config';

export interface Bee3lyStackProps extends cdk.StackProps {
  envName: Bee3lyEnvName;
  /** Comma-separated origins for CORS, WebSocket, OAuth (e.g. https://app.dev.example.com) */
  frontendUrl: string;
}

export class Bee3lyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Bee3lyStackProps) {
    super(scope, id, props);

    const { envName, frontendUrl } = props;
    const cfg = getBee3lyEnvConfig(envName);
    const namespaceName = `${envName}.bee3ly.local`;

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: cfg.natGateways,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'PostgreSQL',
      allowAllOutbound: false,
    });

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Redis',
      allowAllOutbound: false,
    });

    const backendServiceSecurityGroup = new ec2.SecurityGroup(
      this,
      'BackendServiceSecurityGroup',
      {
        vpc,
        description: 'NestJS backend',
        allowAllOutbound: true,
      },
    );

    const aiServiceSecurityGroup = new ec2.SecurityGroup(
      this,
      'AiServiceSecurityGroup',
      {
        vpc,
        description: 'FastAPI AI service',
        allowAllOutbound: true,
      },
    );

    dbSecurityGroup.addIngressRule(
      backendServiceSecurityGroup,
      ec2.Port.tcp(5432),
      'Backend to Postgres',
    );

    redisSecurityGroup.addIngressRule(
      aiServiceSecurityGroup,
      ec2.Port.tcp(6379),
      'AI service to Redis',
    );

    aiServiceSecurityGroup.addIngressRule(
      backendServiceSecurityGroup,
      ec2.Port.tcp(8000),
      'Backend to AI HTTP',
    );

    backendServiceSecurityGroup.addIngressRule(
      aiServiceSecurityGroup,
      ec2.Port.tcp(5000),
      'AI service to backend (tools)',
    );

    const db = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('bay3ly', {
        secretName: `bee3ly/${envName}/database`,
      }),
      databaseName: 'bay3ly',
      instanceType: ec2.InstanceType.of(
        cfg.dbInstanceClass,
        cfg.dbInstanceSize,
      ),
      multiAz: cfg.dbMultiAz,
      deletionProtection: cfg.dbDeletionProtection,
      removalPolicy:
        envName === 'prod'
          ? cdk.RemovalPolicy.SNAPSHOT
          : cdk.RemovalPolicy.DESTROY,
      allocatedStorage: envName === 'prod' ? 50 : 20,
      maxAllocatedStorage: envName === 'prod' ? 200 : 50,
      backupRetention: envName === 'prod' ? cdk.Duration.days(7) : cdk.Duration.days(1),
      storageEncrypted: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      'RedisSubnetGroup',
      {
        description: `Redis subnets (${envName})`,
        subnetIds: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnetIds,
        cacheSubnetGroupName: `bee3ly-${envName}-redis`,
      },
    );

    const redisCluster = new elasticache.CfnCacheCluster(this, 'Redis', {
      engine: 'redis',
      cacheNodeType: cfg.cacheNodeType,
      numCacheNodes: cfg.cacheNumCacheNodes,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName!,
      clusterName: `bee3ly-${envName}-redis`,
    });
    redisCluster.addDependency(redisSubnetGroup);

    const jwtAccessSecret = new secretsmanager.Secret(this, 'JwtAccessSecret', {
      secretName: `bee3ly/${envName}/jwt-access`,
      generateSecretString: {
        passwordLength: 64,
        excludePunctuation: true,
      },
    });

    const jwtRefreshSecret = new secretsmanager.Secret(
      this,
      'JwtRefreshSecret',
      {
        secretName: `bee3ly/${envName}/jwt-refresh`,
        generateSecretString: {
          passwordLength: 64,
          excludePunctuation: true,
        },
      },
    );

    const tokenEncryptionSecret = new secretsmanager.Secret(
      this,
      'TokenEncryptionSecret',
      {
        secretName: `bee3ly/${envName}/token-encryption`,
        generateSecretString: {
          passwordLength: 32,
          excludePunctuation: true,
        },
      },
    );

    const aiServiceTokenSecret = new secretsmanager.Secret(
      this,
      'AiServiceTokenSecret',
      {
        secretName: `bee3ly/${envName}/ai-service-token`,
        generateSecretString: {
          passwordLength: 48,
          excludePunctuation: true,
        },
      },
    );

    const geminiSecret = new secretsmanager.Secret(this, 'GeminiSecret', {
      secretName: `bee3ly/${envName}/gemini-api-key`,
      description:
        'Replace secret value with your GEMINI_API_KEY (plain text) after first deploy.',
      secretStringValue: cdk.SecretValue.unsafePlainText('REPLACE_ME'),
    });

    // Full ARN, including the random suffix. A name-only ARN makes ECS call
    // GetSecretValue on an identifier the execution role is not allowed to read.
    const metaAppSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'MetaAppSecret',
      `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/meta-app-secret-3uADMt`,
    );

    const tiktokClientSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'TikTokClientSecret',
      `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/tiktok-client-secret-Yjyfql`,
    );

    const billingSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'BillingSecret',
      `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/billing-43iITd`,
    );

    const whatsappAccessToken = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'WhatsAppAccessToken',
      `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/whatsapp-access-token-WIhO7P`,
    );

    const repoRoot = path.join(__dirname, '..', '..');
    const backendImageAsset = new DockerImageAsset(this, 'BackendImageAsset', {
      directory: path.join(repoRoot, 'backend'),
    });
    const aiImageAsset = new DockerImageAsset(this, 'AiImageAsset', {
      directory: path.join(repoRoot, 'ai-services'),
    });

    const backendRepo = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: `bee3ly-${envName}-backend`,
      removalPolicy:
        envName === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: envName !== 'prod',
    });

    const aiRepo = new ecr.Repository(this, 'AiRepo', {
      repositoryName: `bee3ly-${envName}-ai`,
      removalPolicy:
        envName === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: envName !== 'prod',
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `bee3ly-${envName}`,
      containerInsights: envName === 'prod',
    });

    const privateSubnetIds = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }).subnetIds;

    const dbSyncBucket = new s3.Bucket(this, 'DbSyncBucket', {
      bucketName: `bee3ly-${envName}-db-sync-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(7) }],
      removalPolicy:
        envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: envName !== 'prod',
    });

    const dbSyncLogGroup = new logs.LogGroup(this, 'DbSyncLogGroup', {
      logGroupName: `/bee3ly/${envName}/db-sync`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dbSyncTaskDef = new ecs.FargateTaskDefinition(this, 'DbSyncTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    dbSyncBucket.grantRead(dbSyncTaskDef.taskRole!);

    dbSyncTaskDef.addContainer('Import', {
      image: ecs.ContainerImage.fromRegistry('postgres:16-alpine'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'import',
        logGroup: dbSyncLogGroup,
      }),
      essential: true,
    });

    const namespace = new servicediscovery.PrivateDnsNamespace(
      this,
      'ServiceDiscovery',
      {
        name: namespaceName,
        vpc,
        description: `Bee3ly ${envName} internal DNS`,
      },
    );

    const aiLogGroup = new logs.LogGroup(this, 'AiLogGroup', {
      logGroupName: `/bee3ly/${envName}/ai`,
      retention:
        envName === 'prod'
          ? logs.RetentionDays.ONE_MONTH
          : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const aiTaskDef = new ecs.FargateTaskDefinition(this, 'AiTaskDef', {
      cpu: cfg.aiCpu,
      memoryLimitMiB: cfg.aiMemoryMiB,
    });

    const redisHost = redisCluster.attrRedisEndpointAddress;
    const redisPort = redisCluster.attrRedisEndpointPort;

    aiTaskDef.addContainer('Ai', {
      image: ecs.ContainerImage.fromDockerImageAsset(aiImageAsset),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ai',
        logGroup: aiLogGroup,
      }),
      environment: {
        PORT: '8000',
        GEMINI_MODEL: 'gemini-3.5-flash-lite',
        REDIS_URL: `redis://${redisHost}:${redisPort}/0`,
        BEE3LY_API_URL: `http://backend.${namespaceName}:5000`,
      },
      secrets: {
        GEMINI_API_KEY: ecs.Secret.fromSecretsManager(geminiSecret),
      },
      portMappings: [{ containerPort: 8000, protocol: ecs.Protocol.TCP }],
    });

    const aiService = new ecs.FargateService(this, 'AiService', {
      cluster,
      taskDefinition: aiTaskDef,
      desiredCount: cfg.aiDesiredCount,
      assignPublicIp: false,
      securityGroups: [aiServiceSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: 'ai',
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
      },
      circuitBreaker: { rollback: true },
    });

    const albService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'BackendService',
      {
        cluster,
        serviceName: `bee3ly-${envName}-backend`,
        cpu: cfg.backendCpu,
        memoryLimitMiB: cfg.backendMemoryMiB,
        desiredCount: cfg.backendDesiredCount,
        publicLoadBalancer: true,
        assignPublicIp: false,
        taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [backendServiceSecurityGroup],
        listenerPort: 80,
        healthCheckGracePeriod: cdk.Duration.seconds(300),
        cloudMapOptions: {
          name: 'backend',
          cloudMapNamespace: namespace,
          dnsRecordType: servicediscovery.DnsRecordType.A,
        },
        circuitBreaker: { rollback: true },
        taskImageOptions: {
          image: ecs.ContainerImage.fromDockerImageAsset(backendImageAsset),
          containerPort: 5000,
          environment: {
            NODE_ENV: envName === 'prod' ? 'production' : 'development',
            PORT: '5000',
            FRONTEND_URL: frontendUrl,
            AI_SERVICE_URL: `http://ai.${namespaceName}:8000`,
            AI_ENGINE_DEV_FALLBACK: envName === 'prod' ? 'false' : 'true',
            JWT_ACCESS_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
            AI_SERVICE_TIMEOUT_MS: '20000',
            AI_SERVICE_TOKEN_TTL: '3600',
            META_APP_ID: '2374012540084160',
            META_REDIRECT_URI: 'https://api.bee3ly.net/social/meta/callback',
            META_OAUTH_EXTRA_SCOPES:
              'instagram_basic,instagram_manage_messages,instagram_manage_comments,ads_management,ads_read',
            META_GRAPH_VERSION: 'v21.0',
            // Dev can create paused Meta ads. Prod stays off until launch is intentional.
            META_ADS_PUBLISH_ENABLED: envName === 'prod' ? 'false' : 'true',
            META_ADS_MOCK: 'false',
            META_WHATSAPP_EMBEDDED_CONFIG_ID: '986448077802892',
            // Meta Cloud API test number — binds on boot when true (dev only).
            WHATSAPP_BIND_TEST_NUMBER: envName === 'prod' ? 'false' : 'true',
            // Pin test WhatsApp to Hillix Pharm so inbox lands on that merchant.
            WHATSAPP_BIND_BUSINESS_ID: '066813ff-5d6b-4fe0-96d6-ee061c5a01a2',
            WHATSAPP_PHONE_NUMBER_ID: '1392264077293649',
            META_COMMENT_POLLING_ENABLED: 'true',
            META_COMMENT_POLL_INTERVAL_MS: '60000',
            META_WEBHOOK_VERIFY_TOKEN: 'bee3ly-verify',
            TIKTOK_CLIENT_KEY: 'sbawc0m7ghba40oiqw',
            TIKTOK_REDIRECT_URI: 'https://api.bee3ly.net/social/tiktok/callback',
            TIKTOK_WEBHOOK_URL: 'https://api.bee3ly.net/social/tiktok/webhook',
            TIKTOK_OAUTH_AUTHORIZE_URL: 'https://www.tiktok.com/v2/auth/authorize/',
            TIKTOK_OAUTH_SCOPES: 'user.info.basic',
          },
          secrets: {
            DB_HOST: ecs.Secret.fromSecretsManager(db.secret!, 'host'),
            DB_PORT: ecs.Secret.fromSecretsManager(db.secret!, 'port'),
            DB_USER: ecs.Secret.fromSecretsManager(db.secret!, 'username'),
            DB_PASSWORD: ecs.Secret.fromSecretsManager(db.secret!, 'password'),
            DB_NAME: ecs.Secret.fromSecretsManager(db.secret!, 'dbname'),
            JWT_ACCESS_SECRET: ecs.Secret.fromSecretsManager(jwtAccessSecret),
            JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(jwtRefreshSecret),
            TOKEN_ENCRYPTION_KEY:
              ecs.Secret.fromSecretsManager(tokenEncryptionSecret),
            AI_SERVICE_TOKEN_SECRET:
              ecs.Secret.fromSecretsManager(aiServiceTokenSecret),
            META_APP_SECRET: ecs.Secret.fromSecretsManager(metaAppSecret),
            TIKTOK_CLIENT_SECRET:
              ecs.Secret.fromSecretsManager(tiktokClientSecret),
            BACKEND_PUBLIC_URL: ecs.Secret.fromSecretsManager(
              billingSecret,
              'BACKEND_PUBLIC_URL',
            ),
            BILLING_ALLOW_DEV_CONFIRM: ecs.Secret.fromSecretsManager(
              billingSecret,
              'BILLING_ALLOW_DEV_CONFIRM',
            ),
            BILLING_METRICS_KEY: ecs.Secret.fromSecretsManager(
              billingSecret,
              'BILLING_METRICS_KEY',
            ),
            PAYMOB_INTEGRATION_ID: ecs.Secret.fromSecretsManager(
              billingSecret,
              'PAYMOB_INTEGRATION_ID',
            ),
            PAYMOB_PUBLIC_KEY: ecs.Secret.fromSecretsManager(
              billingSecret,
              'PAYMOB_PUBLIC_KEY',
            ),
            PAYMOB_SECRET_KEY: ecs.Secret.fromSecretsManager(
              billingSecret,
              'PAYMOB_SECRET_KEY',
            ),
            PAYMOB_HMAC_SECRET: ecs.Secret.fromSecretsManager(
              billingSecret,
              'PAYMOB_HMAC_SECRET',
            ),
            TAP_SECRET_KEY: ecs.Secret.fromSecretsManager(
              billingSecret,
              'TAP_SECRET_KEY',
            ),
            WHATSAPP_ACCESS_TOKEN: ecs.Secret.fromSecretsManager(
              whatsappAccessToken,
            ),
          },
        },
      },
    );

    albService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
    });

    const cfnTargetGroup = albService.targetGroup.node
      .defaultChild as elbv2.CfnTargetGroup;
    cfnTargetGroup.addPropertyOverride(
      'TargetGroupAttributes',
      [
        { Key: 'stickiness.enabled', Value: 'true' },
        { Key: 'stickiness.type', Value: 'lb_cookie' },
        { Key: 'stickiness.lb_cookie.duration_seconds', Value: '86400' },
      ],
    );

    albService.loadBalancer.connections.allowFromAnyIpv4(
      ec2.Port.tcp(443),
      'Public HTTPS to ALB',
    );

    aiService.node.addDependency(redisCluster);
    albService.service.node.addDependency(db);

    const taskExecutionRole = albService.taskDefinition
      .executionRole as iam.Role;
    db.secret?.grantRead(taskExecutionRole);
    jwtAccessSecret.grantRead(taskExecutionRole);
    jwtRefreshSecret.grantRead(taskExecutionRole);
    tokenEncryptionSecret.grantRead(taskExecutionRole);
    aiServiceTokenSecret.grantRead(taskExecutionRole);
    metaAppSecret.grantRead(taskExecutionRole);
    tiktokClientSecret.grantRead(taskExecutionRole);
    // ECS requests the secret by name, without the random ARN suffix.
    // grantRead only allows name-*, so that call is denied.
    const metaSecretBase = `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/meta-app-secret`;
    const metaSecretRead = new iam.Policy(this, 'MetaAppSecretReadPolicy', {
      roles: [taskExecutionRole],
      statements: [
        new iam.PolicyStatement({
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
          ],
          resources: [metaSecretBase, `${metaSecretBase}-*`],
        }),
      ],
    });
    albService.service.node.addDependency(metaSecretRead);
    const tiktokSecretBase = `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/tiktok-client-secret`;
    const tiktokSecretRead = new iam.Policy(this, 'TikTokClientSecretReadPolicy', {
      roles: [taskExecutionRole],
      statements: [
        new iam.PolicyStatement({
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
          ],
          resources: [
            tiktokSecretBase,
            `${tiktokSecretBase}-*`,
            `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/tiktok-client-secret-Yjyfql`,
          ],
        }),
      ],
    });
    albService.service.node.addDependency(tiktokSecretRead);
    const billingSecretBase = `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/billing`;
    const billingSecretRead = new iam.Policy(this, 'BillingSecretReadPolicy', {
      roles: [taskExecutionRole],
      statements: [
        new iam.PolicyStatement({
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
          ],
          resources: [
            billingSecretBase,
            `${billingSecretBase}-*`,
            `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/billing-43iITd`,
          ],
        }),
      ],
    });
    albService.service.node.addDependency(billingSecretRead);
    whatsappAccessToken.grantRead(taskExecutionRole);
    const whatsappSecretBase = `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/whatsapp-access-token`;
    const whatsappSecretRead = new iam.Policy(
      this,
      'WhatsAppAccessTokenReadPolicy',
      {
        roles: [taskExecutionRole],
        statements: [
          new iam.PolicyStatement({
            actions: [
              'secretsmanager:GetSecretValue',
              'secretsmanager:DescribeSecret',
            ],
            resources: [
              whatsappSecretBase,
              `${whatsappSecretBase}-*`,
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:bee3ly/${envName}/whatsapp-access-token-WIhO7P`,
            ],
          }),
        ],
      },
    );
    albService.service.node.addDependency(whatsappSecretRead);
    geminiSecret.grantRead(aiTaskDef.executionRole!);

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `http://${albService.loadBalancer.loadBalancerDnsName}`,
      description: 'Public API base URL (set VITE_API_URL to this until HTTPS/custom domain)',
    });

    new cdk.CfnOutput(this, 'FrontendUrlExpected', {
      value: frontendUrl,
      description: 'FRONTEND_URL on the backend (Vercel site origin)',
    });

    new cdk.CfnOutput(this, 'BackendEcrUri', {
      value: backendRepo.repositoryUri,
    });

    new cdk.CfnOutput(this, 'AiEcrUri', {
      value: aiRepo.repositoryUri,
    });

    new cdk.CfnOutput(this, 'GeminiSecretArn', {
      value: geminiSecret.secretArn,
      description: 'Update secret value to your GEMINI_API_KEY, then restart AI tasks',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: db.secret!.secretArn,
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: `${redisHost}:${redisPort}`,
    });

    new cdk.CfnOutput(this, 'InternalAiUrl', {
      value: `http://ai.${namespaceName}:8000`,
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: cluster.clusterName,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: privateSubnetIds.join(','),
      description: 'For db sync ECS task networking',
    });

    new cdk.CfnOutput(this, 'BackendSecurityGroupId', {
      value: backendServiceSecurityGroup.securityGroupId,
    });

    new cdk.CfnOutput(this, 'DbSyncBucketName', {
      value: dbSyncBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DbSyncTaskDefinitionArn', {
      value: dbSyncTaskDef.taskDefinitionArn,
    });
  }
}
