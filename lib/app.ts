import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpcStack';
import { TableStack } from '../lib/stacks/ddbStack';
import { ServiceStack } from '../lib/stacks/serviceStack';
import { PipelineStack } from '../lib/stacks/pipelineStack';
import { DashboardStack } from '../lib/stacks/dashboardStack';
import { AlarmStack } from '../lib/stacks/alarmStack';
import { EcrStack } from '../lib/stacks/ecrStack';
import { getConfig } from '../lib/config/environment';

const app = new cdk.App();
const envConfig = getConfig();

const vpcStack = new VpcStack(app, 'MensajeVpcStack', {
  env: { region: getConfig().region }
});

const tableStack = new TableStack(app, 'MensajeTableStack', {
  env: { region: getConfig().region }
});

const ecrStack = new EcrStack(app, 'MensajeEcrStack', {
  env: { region: 'us-east-1' }
});

const serviceStack = new ServiceStack(app, 'MensajeServiceStack', {
  env: { region: getConfig().region },
  vpc: vpcStack.vpc,
  mensajesTable: tableStack.mensajesTable,
  seguidoresTable: tableStack.seguidoresTable,
  timelineTable: tableStack.timelineTable,
  ecrRepositoryName: ecrStack.repository.repositoryName,
  ecrRepositoryArn: ecrStack.repository.repositoryArn,
  envConfig
});


const dashboardStack = new DashboardStack(app, 'MensajeDashboardStack', {
  env: { region: getConfig().region  }
});

const pipelineStack = new PipelineStack(app, 'MensajePipelineStack', {
  ecrRepositoryName: ecrStack.repository.repositoryName,
  ecsClusterName: serviceStack.ecsCluster.clusterName,
  ecsServiceName: serviceStack.ecsService.serviceName,
  ecsClusterVpc: vpcStack.vpc,
});


const alarmStack = new AlarmStack(app, 'MensajeAlarmStack', {
  env: { region: getConfig().region  }
});


serviceStack.addDependency(vpcStack);
serviceStack.addDependency(tableStack);
serviceStack.addDependency(ecrStack);
dashboardStack.addDependency(serviceStack);
pipelineStack.addDependency(serviceStack);
alarmStack.addDependency(serviceStack);