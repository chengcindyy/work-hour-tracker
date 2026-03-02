import { defineAuth } from "@aws-amplify/backend";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/ to learn more
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
    },
  },
  multifactorAuthentication: {
    mode: "OPTIONAL",
    totp: true,
  },
  userAttributes: {
    email: {
      mutable: true,
      required: true,
    },
    name: {
      mutable: true,
    },
    phone_number: {
      mutable: true,
    },
  },
  accountRecovery: "EMAIL_ONLY",
  sessionDuration: "days",
  sessionDurationValue: 30,
});
