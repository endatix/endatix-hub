declare module "flags" {
  export type {
    Adapter,
    Identify,
  } from "../node_modules/flags/dist/index.d.ts";
}

declare module "flags/next" {
  export {
    flag,
    dedupe,
    evaluate,
    type Flag,
  } from "../node_modules/flags/dist/next.d.ts";
}
