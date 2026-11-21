/**
 * Minimal ESM hooks so the Node check scripts can import the TypeScript
 * modules, which in turn import the committed JSON datasets.
 *
 * - the `@/*` path alias resolves to the project root, as in tsconfig
 * - extensionless relative imports (`./rate_tracker`) resolve to `.ts`/`.tsx`
 * - `.json` imports come back as a module with a default export
 */
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

export async function resolve(specifier, context, next) {
    const target = specifier.startsWith('@/')
        ? new URL(specifier.slice(2), ROOT).href
        : specifier;
    const isPath = target.startsWith('.') || target.startsWith('file:');
    if (isPath && !/\.[a-z0-9]+$/i.test(target)) {
        for (const ext of ['.ts', '.tsx']) {
            try {
                return await next(`${target}${ext}`, context);
            } catch {
                // try the next extension, then fall through to the normal resolver
            }
        }
    }
    return next(target, context);
}

export async function load(url, context, next) {
    if (url.endsWith('.json')) {
        const source = await readFile(new URL(url), 'utf8');
        return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return next(url, context);
}
