import { defineData, type ClientSchema } from "@aws-amplify/backend";
import { auth } from "./auth";

/**
 * Define your data model and create the backend resources to implement it.
 * @see https://docs.amplify.aws/react/build-a-backend/data/set-up-data/ to learn more
 */

const schema = {
  models: {
    Shop: {
      fields: {
        id: {
          type: "ID",
          isRequired: true,
          primaryKeyIndex: 0,
        },
        userId: {
          type: "String",
          isRequired: true,
          primaryKeyIndex: 1,
        },
        name: {
          type: "String",
          isRequired: true,
        },
        description: {
          type: "String",
        },
        isActive: {
          type: "Boolean",
          isRequired: true,
          default: true,
        },
        createdAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
        updatedAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
      },
      primaryKey: ["userId", "id"],
      indexes: {
        userIdIndex: {
          fields: ["userId"],
          queryField: "shopsByUserId",
        },
      },
    },
    ServiceType: {
      fields: {
        id: {
          type: "ID",
          isRequired: true,
          primaryKeyIndex: 0,
        },
        shopId: {
          type: "ID",
          isRequired: true,
          primaryKeyIndex: 1,
        },
        name: {
          type: "String",
          isRequired: true,
        },
        hourlyPay: {
          type: "Float",
          isRequired: true,
        },
        description: {
          type: "String",
        },
        isActive: {
          type: "Boolean",
          isRequired: true,
          default: true,
        },
        createdAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
        updatedAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
      },
      primaryKey: ["shopId", "id"],
    },
    WorkRecord: {
      fields: {
        id: {
          type: "ID",
          isRequired: true,
          primaryKeyIndex: 0,
        },
        userId: {
          type: "String",
          isRequired: true,
          primaryKeyIndex: 1,
        },
        shopId: {
          type: "ID",
          isRequired: true,
        },
        serviceTypeId: {
          type: "ID",
          isRequired: true,
        },
        workDate: {
          type: "AWSDate",
          isRequired: true,
        },
        hours: {
          type: "Float",
          isRequired: true,
        },
        tips: {
          type: "Float",
          isRequired: true,
          default: 0,
        },
        hourlyPay: {
          type: "Float",
          isRequired: true,
        },
        totalEarnings: {
          type: "Float",
          isRequired: true,
        },
        notes: {
          type: "String",
        },
        createdAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
        updatedAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
      },
      primaryKey: ["userId", "id"],
      indexes: {
        userIdIndex: {
          fields: ["userId"],
          queryField: "recordsByUserId",
        },
      },
    },
    NotificationSetting: {
      fields: {
        id: {
          type: "ID",
          isRequired: true,
          primaryKeyIndex: 0,
        },
        userId: {
          type: "String",
          isRequired: true,
          primaryKeyIndex: 1,
        },
        isEnabled: {
          type: "Boolean",
          isRequired: true,
          default: true,
        },
        reminderTime: {
          type: "String",
          isRequired: true,
        },
        reminderDays: {
          type: "String",
          isRequired: true,
        },
        createdAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
        updatedAt: {
          type: "AWSDateTime",
          isRequired: true,
        },
      },
      primaryKey: ["userId"],
    },
  },
  authorization: [
    {
      provider: "userPool",
      rules: [
        {
          groupClaim: "cognito:groups",
          provider: "userPool",
          allow: "groups",
          groupsField: "groups",
          operations: ["create", "read", "update", "delete"],
        },
        {
          allow: "owner",
          ownerField: "userId",
          operations: ["create", "read", "update", "delete"],
          provider: "userPool",
          identifierField: "sub",
        },
      ],
    },
  ],
} as const;

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
