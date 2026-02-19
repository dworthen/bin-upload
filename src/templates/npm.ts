export const binIndexJs = `
import { join } from "node:path";
import { existsSync } from "node:fs";

export function getBinPath() {
  const binPath = join(import.meta.dirname, "bin", "<%= it.binFilename %>");
  if (!existsSync(binPath)) {
    throw new Error(\`Binary not found at expected path:  \${binPath}\`);
  }
  return binPath;
}
`

export const mainPkgIndexJs = `#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chmod } from "node:fs/promises";

const supported_platforms = new Map([
<% it.packages.forEach(pkg => { %>
  ["<%= pkg[0] %>", "<%= pkg[1] %>"],
<% }) %>
]);

async function run() {
  return new Promise(async (resolve) => {
    const os = process.platform;
    const cpu = process.arch;
    const key = \`\${os}-\${cpu}\`;
    if (!supported_platforms.has(key)) {
      throw new Error(\`Platform \${key} is not supported\`);
    }
  
    const args = process.argv.slice(2);
    let getBinPath;
    try {
        const d = await import(supported_platforms.get(key));
        getBinPath = d.getBinPath;
    } catch (err) {
        console.error(\`Failed to import \${supported_platforms.get(key)}.\`);
        console.error(\`Please make sure to install the package \${supported_platforms.get(key)} as a dependency.\`);
        throw err;
    }
    const binPath = getBinPath();
    await chmod(binPath, 0o774);
    const cp = spawn(binPath, args, { stdio: "inherit" });
    cp.on("close", resolve);
  });
}

process.exit(await run());
`
