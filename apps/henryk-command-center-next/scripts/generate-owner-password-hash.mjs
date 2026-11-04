import { scryptSync, randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
  console.error("Uruchom skrypt bezpośrednio w interaktywnym terminalu.");
  process.exitCode = 1;
} else {
  const input = [];
  stdout.write("Nowe hasło owner (min. 12 znaków): ");
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();
  stdin.on("data", (chunk) => {
    for (const character of chunk) {
      if (character === "\u0003") {
        stdin.setRawMode(false);
        stdout.write("\nAnulowano.\n");
        process.exit(130);
      }
      if (character === "\r" || character === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        const password = input.join("");
        if (password.length < 12 || password.length > 256) {
          console.error("Hasło musi mieć od 12 do 256 znaków.");
          process.exitCode = 1;
          return;
        }
        const salt = randomBytes(16);
        const hash = scryptSync(password, salt, 64, {
          N: 16_384,
          r: 8,
          p: 1,
          maxmem: 128 * 1024 * 1024,
        });
        console.log(`scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
        return;
      }
      if (character === "\u007f" || character === "\b") {
        if (input.length > 0) {
          input.pop();
          stdout.write("\b \b");
        }
        continue;
      }
      if (character >= " ") {
        input.push(character);
        stdout.write("*");
      }
    }
  });
}
