#!/usr/bin/env node
import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";

class AuthRequiredAgent {
  async initialize() {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: false,
      },
      authMethods: [
        {
          id: "login",
          name: "Login",
          type: "terminal",
        },
      ],
    };
  }

  async newSession() {
    throw acp.RequestError.authenticationRequired("Login required");
  }

  async authenticate() {
    return {};
  }

  async prompt() {
    return {
      stopReason: "end_turn",
    };
  }

  async cancel() {
    return {};
  }
}

const output = Writable.toWeb(process.stdout);
const input = Readable.toWeb(process.stdin);
const stream = acp.ndJsonStream(output, input);
new acp.AgentSideConnection(() => new AuthRequiredAgent(), stream);
