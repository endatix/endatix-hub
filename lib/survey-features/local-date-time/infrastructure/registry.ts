import { FunctionFactory } from "survey-core";
import { LOCAL_DATE_TIME_FUNCTION } from "../constants";
import { edxLocalDateTime } from "../functions";

let registered = false;

/** Registers `edxLocalDateTime` once. A second call leaves the first function in place. */
export function registerLocalDateTime(): void {
  if (registered) return;
  FunctionFactory.Instance.register(LOCAL_DATE_TIME_FUNCTION, edxLocalDateTime, false, false);
  registered = true;
}
