import { type as osType } from 'node:os';
import * as sp from 'node:path';
const platform = process.platform;
export const isWindows = platform === 'win32';
export const isMacos = platform === 'darwin';
export const isLinux = platform === 'linux';
export const isFreeBSD = platform === 'freebsd';
export const isIBMi = osType() === 'OS400';
export function errorCode(error) {
    return error?.code;
}
export function classifyError(error) {
    const code = errorCode(error);
    if (code === 'ENOENT' || code === 'ENOTDIR')
        return 'missing';
    if (code === 'EPERM' || code === 'EACCES')
        return 'permission';
    if (code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM')
        return 'recursive-unsupported';
    return 'other';
}
export function isMissingError(error) {
    return classifyError(error) === 'missing';
}
export function isPermissionError(error) {
    return classifyError(error) === 'permission';
}
export function isRecursiveWatchUnsupported(error) {
    return classifyError(error) === 'recursive-unsupported';
}
export const systemScheduler = Object.freeze({
    now: () => Date.now(),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => {
        if (timer)
            clearTimeout(timer);
    },
});
export const EVENTS = {
    ALL: 'all',
    READY: 'ready',
    ADD: 'add',
    CHANGE: 'change',
    ADD_DIR: 'addDir',
    UNLINK: 'unlink',
    UNLINK_DIR: 'unlinkDir',
    RAW: 'raw',
    ERROR: 'error',
};
const BACK_SLASH_RE = /\\/g;
const DOUBLE_SLASH_RE = /\/\//g;
export function normalizePath(path) {
    if (typeof path !== 'string')
        throw new TypeError('string expected');
    const unix = path.replace(BACK_SLASH_RE, '/');
    const unc = unix.startsWith('//');
    let normalized = sp.normalize(unix).replace(BACK_SLASH_RE, '/').replace(DOUBLE_SLASH_RE, '/');
    if (unc && !normalized.startsWith('//'))
        normalized = `/${normalized}`;
    return normalized;
}
/**
 * Plain-number size, mtime, and inode. readdirp returns BigIntStats on Windows,
 * which never compare equal to the number Stats of `lstat`.
 */
export function statIdentity(stats) {
    if (typeof stats.mtimeMs !== 'bigint')
        return stats;
    const big = stats;
    const sec = big.mtimeNs / 1000000000n;
    const nsec = big.mtimeNs % 1000000000n;
    // Node's own number formula, so both kinds of Stats agree exactly.
    const mtimeMs = Number(sec) * 1e3 + Number(nsec) / 1e6;
    return { size: Number(big.size), mtimeMs, ino: Number(big.ino) };
}
export function logicalPathKey(path) {
    const resolved = sp.resolve(path);
    return (isWindows || !resolved.includes('\\')
        ? resolved.replace(BACK_SLASH_RE, '/')
        : normalizePath(resolved));
}
function isInsideRelativePath(relative) {
    return relative !== '..' && !relative.startsWith(`..${sp.sep}`) && !sp.isAbsolute(relative);
}
export function isSameOrInside(root, candidate) {
    const relative = sp.relative(root, candidate);
    return relative === '' || isInsideRelativePath(relative);
}
export function isStrictlyInside(root, candidate) {
    const relative = sp.relative(root, candidate);
    return relative !== '' && isInsideRelativePath(relative);
}
export function isMatcherObject(matcher) {
    return typeof matcher === 'object' && matcher !== null && !(matcher instanceof RegExp);
}
export function cloneOwnedMatcher(matcher) {
    if (matcher instanceof RegExp)
        return new RegExp(matcher.source, matcher.flags);
    if (isMatcherObject(matcher))
        return Object.freeze({ ...matcher });
    return matcher;
}
function compileMatcher(matcher) {
    if (typeof matcher === 'function')
        return matcher;
    if (typeof matcher === 'string')
        return (candidate) => matcher === candidate;
    if (matcher instanceof RegExp) {
        return (candidate) => {
            matcher.lastIndex = 0;
            return matcher.test(candidate);
        };
    }
    if (isMatcherObject(matcher)) {
        return (candidate) => matcher.path === candidate ||
            Boolean(matcher.recursive && isStrictlyInside(matcher.path, candidate));
    }
    return () => false;
}
export function compileMatchers(matchers) {
    const patterns = matchers.map(compileMatcher);
    return (candidate, stats) => {
        if (patterns.length === 0)
            return false;
        const normalized = normalizePath(candidate);
        return patterns.some((pattern) => pattern(normalized, stats));
    };
}
export function normalizeMatcher(matcher, cwd = process.cwd()) {
    if (typeof matcher === 'string') {
        return normalizePath(sp.isAbsolute(matcher) ? matcher : sp.join(cwd, matcher));
    }
    if (isMatcherObject(matcher)) {
        return {
            path: normalizePath(sp.isAbsolute(matcher.path) ? matcher.path : sp.join(cwd, matcher.path)),
            recursive: matcher.recursive,
        };
    }
    return matcher;
}
const REPLACER_RE = /^\.[/\\]/;
/** Temporary traversal scope; replaced by the observation engine's root scope. */
export class WatchHelper {
    watchPath;
    followSymlinks;
    recursiveRoot;
    recursiveDisabled;
    observationTrigger;
    realpathAncestry;
    pathGeneration;
    context;
    constructor(path, follow, context) {
        this.context = context;
        this.watchPath = path.replace(REPLACER_RE, '');
        this.followSymlinks = follow;
        this.realpathAncestry = new Set();
        this.pathGeneration = context.capturePathGeneration();
    }
    fork(path) {
        // Filters must resolve scan entries against the fork's own watchPath, not
        // the parent's, or nested entries are matched as if they were siblings.
        const helper = new WatchHelper(path, this.followSymlinks, this.context);
        helper.recursiveRoot = this.recursiveRoot;
        helper.recursiveDisabled = this.recursiveDisabled;
        helper.observationTrigger = this.observationTrigger;
        helper.realpathAncestry = new Set(this.realpathAncestry);
        helper.pathGeneration = this.pathGeneration;
        return helper;
    }
    withObservation(trigger) {
        const helper = Object.create(this);
        helper.observationTrigger = trigger;
        return helper;
    }
    filterPath(entry) {
        return entry.stats?.isSymbolicLink()
            ? this.filterDir(entry)
            : this.context.isntIgnored(sp.join(this.watchPath, entry.path), entry.stats);
    }
    filterDir(entry) {
        return this.context.isntIgnored(sp.join(this.watchPath, entry.path), entry.stats);
    }
}
