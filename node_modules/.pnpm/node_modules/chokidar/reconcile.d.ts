import type { Stats } from 'node:fs';
import type { EntryInfo } from 'readdirp';
import type { WatchHelper } from './runtime.js';
import { type BackendTrigger, type NativeTrigger, type Path } from './runtime.js';
import { type WatcherContext } from './tree.js';
type AddPathOutcome = 'complete' | 'watch-parent';
/** Reconcile exactly one candidate path; its siblings are never scanned. */
type ExactCandidate = {
    onRootMissing?: () => void;
};
/** Collects what a recursive rescan saw so absent tracked entries can be removed. */
type RecursiveRescan = {
    seen: Set<string>;
    directories: string[];
    complete: boolean;
};
/** The only scanner, subscriber, and filesystem transition engine. */
export declare class ObservationEngine {
    fsw: WatcherContext;
    reportError: (error: unknown) => void;
    constructor(fsW: WatcherContext);
    /**
     * Watch a path with the owned polling scheduler or fs.watch.
     * @param path to file or dir
     * @param listener on fs change
     * @returns closer for the watcher instance
     */
    subscribePath(path: string, listener: (path: string, newStats: Stats | undefined, trigger: BackendTrigger) => void | Promise<void>, initialStats?: Stats, mapRelative?: boolean, queueScope?: string): (() => void | Promise<void>) | undefined;
    /**
     * Watch a followed file symlink through the target's parent directory.
     * macOS also starts a one-shot exact-target fallback: FSEvents can omit the
     * first directory callback immediately after a subscription is established.
     */
    subscribeMappedFile(logicalPath: string, targetPath: string, helper: WatchHelper, depth: number, useExactFallback?: boolean): (() => void | Promise<void>) | undefined;
    private mappedFileSnapshot;
    /**
     * macOS can follow an exact symlink handle and miss the link's own removal.
     * Check only link existence so target-directory activity stays invisible when
     * followSymlinks is disabled.
     */
    watchSymlinkDeletion(path: string, force?: boolean): (() => void) | undefined;
    /**
     * Map one backend notification into a logical candidate and serialize its
     * filesystem reconciliation in the owning watcher instance.
     */
    reconcileBackendTrigger(scope: string, mapRelative: boolean, trigger: BackendTrigger, reconcile: (candidate: string) => void | Promise<void>, isActive?: () => boolean, coalesce?: boolean, queueScope?: string): Promise<void>;
    /**
     * Watch a file and emit add event if warranted.
     * @returns closer for the watcher instance
     */
    handleFile(file: Path, stats: Stats, initialAdd: boolean, watchResource?: boolean, trigger?: NativeTrigger, initialRecursive?: boolean, retainObservation?: boolean): (() => void | Promise<void>) | undefined;
    /**
     * Handle symlinks encountered while reading a dir.
     * @param entry returned by readdirp
     * @param directory path of dir being read
     * @param path of this item
     * @param item basename of this item
     * @returns true if no more processing is needed for this entry.
     */
    handleSymlink(entry: EntryInfo, directory: string, path: Path, item: string, initialAdd: boolean, wh?: WatchHelper): Promise<boolean | undefined>;
    readDirectory(directory: string, initialAdd: boolean, wh: WatchHelper, target: Path | undefined, dir: Path, depth: number): Promise<void> | undefined;
    private removeIfMissing;
    /**
     * Populate the logical directory tree beneath one native recursive watcher.
     * Regular entries are consumed synchronously from readdirp's stat-bearing
     * stream; only symlinks need the full per-path add machinery.
     */
    scanRecursiveTree(dir: string, initialAdd: boolean, wh: WatchHelper, baseDepth: number, rescan?: RecursiveRescan): Promise<void> | undefined;
    /**
     * Reconcile a whole recursive root after an invalidation that names no path
     * (a backend buffer overflow) or a replay buffer overflow. A shallow root
     * listing would miss every change below the first level.
     */
    rescanRecursiveTree(dir: string, wh: WatchHelper, baseDepth: number): Promise<void>;
    isHelperActive(wh: WatchHelper, path?: string): boolean;
    private candidateDepth;
    private candidateIgnored;
    private highestMissingPath;
    reconcileNativeTrigger(root: string, rootHelper: WatchHelper, trigger: NativeTrigger, candidateOverride?: string, baseDepth?: number, exact?: ExactCandidate): Promise<void>;
    /**
     * Keep a Windows parent handle for a directly watched directory. Windows can
     * silently retire the directory's own handle when an empty root is removed;
     * its parent still receives the namespace transition and can reconcile it.
     */
    watchRootParent(dir: string, wh: WatchHelper): (() => void | Promise<void>) | undefined;
    watchRecursiveDirectory(dir: string, initialAdd: boolean, depth: number, wh: WatchHelper): Promise<(() => void | Promise<void>) | false | undefined>;
    /**
     * A recursive root that falls back to per-directory handles already tracks
     * every subdirectory, so the fallback scan sees none of them as new. Give
     * each its own subscription; existing entries emit nothing.
     */
    private subscribeTrackedDirectories;
    /**
     * Read directory to add / remove files from `@watched` list and re-read it on change.
     * @param dir fs path
     * @param stats
     * @param initialAdd
     * @param depth relative to user-supplied path
     * @param target child path targeted for watch
     * @param wh Common watch helpers for this path
     * @returns closer for the watcher instance.
     */
    handleDirectory(dir: string, stats: Stats, initialAdd: boolean, depth: number, target: string | undefined, wh: WatchHelper): Promise<(() => void | Promise<void>) | undefined>;
    /**
     * Handle added file, directory, or glob pattern.
     * Delegates call to handleFile / handleDirectory after checks.
     * @param path to file or ir
     * @param initialAdd was the file added at watch instantiation?
     * @param priorWh depth relative to user-supplied path
     * @param depth Child path actually targeted for watch
     * @param target Child path actually targeted for watch
     */
    addRoot(path: string, initialAdd: boolean, pathGeneration: number, target?: string): Promise<void>;
    addPathOnce(path: string, initialAdd: boolean, priorWh: WatchHelper | undefined, depth: number, target?: string, pathGeneration?: number): Promise<AddPathOutcome>;
}
export {};
