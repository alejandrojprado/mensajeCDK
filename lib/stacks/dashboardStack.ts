import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as fs from 'fs';
import * as path from 'path';

export class DashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dashboardDefinitionPath = path.join(__dirname, '..', 'dashboard', 'dashboard.json');
    const dashboardBody = fs.readFileSync(dashboardDefinitionPath, 'utf8');

    new cloudwatch.CfnDashboard(this, 'ServiceDashboard', {
      dashboardName: 'ServiceDashboard',
      dashboardBody: dashboardBody
    });
  }
}