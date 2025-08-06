import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class TableStack extends cdk.Stack {
  public readonly mensajesTable: dynamodb.Table;
  public readonly seguidoresTable: dynamodb.Table;
  public readonly timelineTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.mensajesTable = new dynamodb.Table(this, 'MessagesTable', {
      tableName: 'mensajes',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'message_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.seguidoresTable = new dynamodb.Table(this, 'FollowsTable', {
      tableName: 'seguidores',
      partitionKey: {
        name: 'follower_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'following_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.seguidoresTable.addGlobalSecondaryIndex({
      indexName: 'FollowingIndex',
      partitionKey: {
        name: 'following_id',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    this.timelineTable = new dynamodb.Table(this, 'TimelineTable', {
      tableName: 'timeline',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}