import { isFullRelease } from '../util/npm-parser';
import { findAll } from '../util/backend/db';
import { getVersionsForChart, getPublishDate } from '../util/npm-api';
import { getPkgDetails } from './common';

export async function getResultProps(
    inputStr: string,
    pkgVersions: PackageVersion[],
    manifest: NpmManifest | null,
    force: boolean,
    tmpDir: string,
): Promise<ResultProps> {
    const parsed = pkgVersions[0];
    if (!parsed) {
        throw new Error('Expected one or more versions');
    }
    const { pkgSize, allVersions, cacheResult, isLatest } = await getPkgDetails(
        manifest,
        parsed.name,
        parsed.version,
        force,
        tmpDir,
    );

    const { name, version } = pkgSize;

    const filteredVersions =
        pkgVersions.length > 1
            ? pkgVersions.map(p => p.version).filter(notEmpty)
            : isFullRelease(version)
            ? allVersions.filter(isFullRelease)
            : allVersions;

    const chartVersions = getVersionsForChart(filteredVersions, version, 7);

    const cachedVersions = await findAll(name);

    const readings = chartVersions.map(v => {
        return (
            cachedVersions[v] || {
                name: name,
                version: v,
                publishDate: getPublishDate(manifest, v),
                publishSize: 0,
                installSize: 0,
                publishFiles: 0,
                installFiles: 0,
                disabled: true,
            }
        );
    });

    return {
        pkgSize,
        readings,
        cacheResult,
        isLatest,
        inputStr,
    };
}

function notEmpty<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}
