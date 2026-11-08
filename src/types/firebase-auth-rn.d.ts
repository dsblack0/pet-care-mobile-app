// firebase/auth ships getReactNativePersistence in its React Native build, but the package's
// public typings leave it out.
import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
