import semver from 'semver';

export function getPreReleaseTag(version: string): string | null {
	const segments = semver.prerelease(version);

    if (!segments) return null;

    return segments[0].toString() ?? null
}
