export interface EnvironmentConfig {
    region: string;
    environmentName: string;
    ttlDays: number;
    logLevel: string;
    port: string;
  }
  
  const config: Record<string, EnvironmentConfig> = {
    dev: {
      region: 'us-east-1',
      environmentName: 'dev',
      ttlDays: 7,
      logLevel: 'info',
      port: '80'
    }
  };
  
  export const getConfig = (): EnvironmentConfig => {
    const env = process.env.ENVIRONMENT || 'dev';
    return config[env];
  };