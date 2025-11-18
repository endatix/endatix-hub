import {
  sessionBridgeHandler,
  SessionBridgeHandlers,
} from "./session-bridge-handlers";

export const sessionBridgeHandlers: SessionBridgeHandlers = {
  POST: sessionBridgeHandler,
};
