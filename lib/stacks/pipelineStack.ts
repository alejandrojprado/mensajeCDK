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
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact();

    const sourceAction = new cpactions.EcrSourceAction({
      actionName: 'ECR_Source',
      repository: cdk.aws_ecr.Repository.fromRepositoryName(this, 'EcrRepo', props.ecrRepositoryName),
      imageTag: 'latest',
      output: sourceOutput
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

    new codepipeline.Pipeline(this, 'MensajePipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction]
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
        }
      ]
    });
  }
}