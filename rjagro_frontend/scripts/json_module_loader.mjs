/**
 * Minimal ESM hooks so the Node check scripts can import the TypeScript
 * modules, which in turn import the committed JSON datasets.
 *
 * - extensionless relative imports (`./rate_tracker`) resolve to `.ts`
 * - `.json` imports come back as a module with a default export
 */
import { readFile } from 'node:fs/promises';

export async function resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z0-9]+$/i.test(specifier)) {
        try {
            return await next(`${specifier}.ts`, context);
        } catch {
            // fall through to the normal resolver
        }
        try {
            return await next(`${specifier}.tsx`, context);
        } catch {
            // fall through
        }
    }
    return next(specifier, context);
}

export async function load(url, context, next) {
    if (url.endsWith('.json')) {
        const source = await readFile(new URL(url), 'utf8');
        return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return next(url, context);
}
