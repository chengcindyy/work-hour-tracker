import { defineStorage } from "@aws-amplify/backend";

/**
 * Define and configure your storage resource
 * @see https://docs.amplify.aws/react/build-a-backend/storage/set-up-storage/ to learn more
 */
export const storage = defineStorage({
  name: "workHourTrackerStorage",
  access: (allow) => ({
    "public/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "protected/{identity_id}/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "private/{identity_id}/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});
