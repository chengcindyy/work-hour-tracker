import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth";
import { data } from "./data";
import { storage } from "./storage";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to learn how to use defineBackend
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
});
