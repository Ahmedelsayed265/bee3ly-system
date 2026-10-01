import * as ec2 from 'aws-cdk-lib/aws-ec2';

export type Bee3lyEnvName = 'dev' | 'prod';

export interface Bee3lyEnvConfig {
  backendCpu: number;
  backendMemoryMiB: number;
  backendDesiredCount: number;
  aiCpu: number;
  aiMemoryMiB: number;
  aiDesiredCount: number;
  dbInstanceClass: ec2.InstanceClass;
  dbInstanceSize: ec2.InstanceSize;
  dbMultiAz: boolean;
  dbDeletionProtection: boolean;
  cacheNodeType: string;
  cacheNumCacheNodes: number;
  natGateways: number;
}

export function getBee3lyEnvConfig(envName: Bee3lyEnvName): Bee3lyEnvConfig {
  if (envName === 'prod') {
    return {
      backendCpu: 1024,
      backendMemoryMiB: 2048,
      backendDesiredCount: 2,
      aiCpu: 512,
      aiMemoryMiB: 1024,
      aiDesiredCount: 2,
      dbInstanceClass: ec2.InstanceClass.T4G,
      dbInstanceSize: ec2.InstanceSize.SMALL,
      dbMultiAz: true,
      dbDeletionProtection: true,
      cacheNodeType: 'cache.t4g.small',
      cacheNumCacheNodes: 2,
      natGateways: 2,
    };
  }

  return {
    backendCpu: 512,
    backendMemoryMiB: 1024,
    backendDesiredCount: 1,
    aiCpu: 256,
    aiMemoryMiB: 512,
    aiDesiredCount: 1,
    dbInstanceClass: ec2.InstanceClass.T4G,
    dbInstanceSize: ec2.InstanceSize.MICRO,
    dbMultiAz: false,
    dbDeletionProtection: false,
    cacheNodeType: 'cache.t4g.micro',
    cacheNumCacheNodes: 1,
    natGateways: 1,
  };
}
