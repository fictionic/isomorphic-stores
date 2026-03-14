import { unlink } from 'node:fs/promises';

export async function buildClientBundle(pageModulePath: string): Promise<string> {
  const entryPath = `/tmp/iso-client-entry-${Date.now()}.tsx`;

  await Bun.write(entryPath, `
import PageClass from ${JSON.stringify(pageModulePath)};
import { bootstrap } from ${JSON.stringify(import.meta.dir + '/bootstrap.tsx')};
bootstrap(PageClass);
`);

  try {
    const result = await Bun.build({
      entrypoints: [entryPath],
      target: 'browser',
      minify: false,
    });

    if (!result.success) {
      for (const msg of result.logs) console.error(msg);
      throw new Error('Client bundle build failed');
    }

    return await result.outputs[0]!.text();
  } finally {
    await unlink(entryPath).catch(() => {});
  }
}
