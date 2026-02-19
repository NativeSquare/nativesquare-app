import { ConvexError } from "convex/values";

export function getConvexErrorMessage(error: unknown): string {
  let msg: unknown;
  if (error instanceof ConvexError) {
    msg = (error.data as { message?: unknown })?.message;
  } else if (error instanceof Error) {
    msg = error.message;
  } else {
    msg = undefined;
  }
  return typeof msg === "string" ? msg : "Unknown error occurred";
}
