import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

interface PipelineStackProps extends cdk.StackProps {
  ecrRepositoryName: string;
  ecsClusterName: string;
  ecsServiceName: string;
  ecsClusterVpc: cdk.aws_ec2.IVpc;
  loadBalancerDns?: string;
  testEcrRepositoryName?: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact();
    const testSourceOutput = new codepipeline.Artifact();

    const sourceAction = new cpactions.EcrSourceAction({
      actionName: 'ECR_Source',
      repository: cdk.aws_ecr.Repository.fromRepositoryName(this, 'EcrRepo', props.ecrRepositoryName),
      imageTag: 'latest',
      output: sourceOutput
    });

    const testSourceAction = new cpactions.EcrSourceAction({
      actionName: 'Test_Image_Source',
      repository: cdk.aws_ecr.Repository.fromRepositoryName(this, 'TestEcrRepo', props.testEcrRepositoryName || 'mensaje-service-tests'),
      imageTag: 'latest',
      output: testSourceOutput
    });

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'export IMAGE_URI=$(cat imageDetail.json | jq -r ".ImageURI")',
              'jq -n --arg name "MensajeContainer" --arg imageUri "$IMAGE_URI" \'[{\"name\":$name,\"imageUri\":$imageUri}]\' > imagedefinitions.json'
            ]
          }
        },
        artifacts: {
          files: [
            'imagedefinitions.json'
          ]
        }
      })
    });

    const buildOutput = new codepipeline.Artifact();

    const buildAction = new cpactions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const integrationTestProject = new codebuild.PipelineProject(this, 'IntegrationTestProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
              'docker pull $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/mensaje-service-tests:latest'
            ]
          },
          build: {
            commands: [
              'docker run --rm -e SERVICE_URL=$SERVICE_URL $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/mensaje-service-tests:latest'
            ]
          }
        }
      }),
      environmentVariables: {
        SERVICE_URL: {
          value: props.loadBalancerDns || 'http://localhost',
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT
        }
      }
    });

    const integrationTestAction = new cpactions.CodeBuildAction({
      actionName: 'IntegrationTests',
      project: integrationTestProject,
      input: testSourceOutput,
    });

    new codepipeline.Pipeline(this, 'MensajePipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction, testSourceAction]
        },
        {
          stageName: 'Build',
          actions: [buildAction]
        },
        {
          stageName: 'Deploy',
          actions: [
            new cpactions.EcsDeployAction({
              actionName: 'DeployToECS',
              service: cdk.aws_ecs.FargateService.fromFargateServiceAttributes(this, 'EcsService', {
                cluster: cdk.aws_ecs.Cluster.fromClusterAttributes(this, 'EcsCluster', {
                  clusterName: props.ecsClusterName,
                  vpc: props.ecsClusterVpc,
                }),
                serviceName: props.ecsServiceName,
              }),
              input: buildOutput,
            })
          ]
        },
        {
          stageName: 'IntegrationTests',
          actions: [integrationTestAction]
        }
      ]
    });
  }
}