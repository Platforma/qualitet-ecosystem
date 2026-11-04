import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const input = process.stdin;
const output = process.stdout;

if (!input.isTTY || typeof input.setRawMode !== "function") {
  console.error("Run this command in an interactive terminal to enter the password securely.");
  process.exitCode = 1;
} else {
  input.setRawMode(true);
  input.setEncoding("utf8");
  input.resume();
  output.write("Shop owner password (12-256 characters): ");

  const password = await new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Password entry cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\b" || character === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    };
    input.on("data", onData);
  });

  if (password.length < 12 || password.length > 256) {
    console.error("Shop owner password must contain 12-256 characters.");
    process.exitCode = 1;
  } else {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 128 * 1024 * 1024,
    });
    console.log(`scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
  }
}
