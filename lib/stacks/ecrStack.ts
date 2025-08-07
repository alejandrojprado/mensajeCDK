import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;
  public readonly testRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, 'mensajeServiceRepository', {
      repositoryName: 'mensaje-service',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
    });

    this.testRepository = new ecr.Repository(this, 'MensajeTestRepository', {
      repositoryName: 'mensaje-service-tests',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
    });
  }
}