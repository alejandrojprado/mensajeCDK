import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { EnvironmentConfig } from '../config/environment';

interface ServiceStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  mensajesTable: dynamodb.ITable;
  seguidoresTable: dynamodb.ITable;
  timelineTable: dynamodb.ITable;
  envConfig: EnvironmentConfig;
  ecrRepositoryArn: string;
  ecrRepositoryName: string;
}

export class ServiceStack extends cdk.Stack {
  public readonly ecsCluster: ecs.ICluster;
  public readonly ecsService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'MensajeCluster', {
      vpc: props.vpc,
      clusterName: 'ServiceCluster',
      containerInsights: true
    });
    this.ecsCluster = cluster;

    const logGroup = new logs.LogGroup(this, 'MensajeLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK
    });

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const repository = ecr.Repository.fromRepositoryAttributes(this, 'MensajeEcrRepo', {
      repositoryArn: props.ecrRepositoryArn,
      repositoryName: props.ecrRepositoryName,
    });

    const containerImage = ecs.ContainerImage.fromEcrRepository(repository);

    const container = taskDef.addContainer('MensajeContainer', {
      image: containerImage,
      logging: ecs.LogDriver.awsLogs({
        logGroup,
        streamPrefix: 'Acortador'
      })
    });

    container.addPortMappings({ containerPort: 80 });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'MensajeService', {
      cluster,
      taskDefinition: taskDef,
      publicLoadBalancer: true,
      assignPublicIp: true,
      desiredCount: 1,
      listenerPort: 80,
      loadBalancerName: 'MensajeLB',
      memoryLimitMiB: 512,
      cpu: 256,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      serviceName: 'MensajeService',
    });
    this.ecsService = service.service;

    const dnsUrl = 'http://' + service.loadBalancer.loadBalancerDnsName

    container.addEnvironment('BASE_URL', dnsUrl);
    container.addEnvironment('ENV', props.envConfig.environmentName);
    container.addEnvironment('LOG_LEVEL', props.envConfig.logLevel);
    container.addEnvironment('TTL_DAYS', props.envConfig.ttlDays.toString());
    container.addEnvironment('DDB_TABLE_MENSAJES', props.mensajesTable.tableName);
    container.addEnvironment('DDB_TABLE_SEGUIDORES', props.seguidoresTable.tableName);
    container.addEnvironment('DDB_TABLE_TIMELINE', props.timelineTable.tableName);
    container.addEnvironment('PORT', props.envConfig.port);

    props.mensajesTable.grantReadWriteData(taskDef.taskRole);
    props.seguidoresTable.grantReadWriteData(taskDef.taskRole);
    props.timelineTable.grantReadWriteData(taskDef.taskRole);

    taskDef.taskRole?.attachInlinePolicy(new iam.Policy(this, 'CloudWatchMetricsPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cloudwatch:PutMetricData'
          ],
          resources: ['*']
        })
      ]
    }));

    const scaling = service.service.autoScaleTaskCount({ maxCapacity: 4 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 60,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    service.targetGroup.configureHealthCheck({
      path: '/ping',
    });

  }
}