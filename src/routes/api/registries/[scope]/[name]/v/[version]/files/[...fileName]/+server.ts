import { error } from '@sveltejs/kit';

export async function GET({ params }) {
    const { scope, name, version, fileName } = params;

    if (!scope.startsWith('@')) {
        error(400, `invalid scope '${scope}' scopes must start with '@'`);
    }
}