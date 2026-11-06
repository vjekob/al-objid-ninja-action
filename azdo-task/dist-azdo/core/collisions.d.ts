import { ALObject, Collision, DiscoveredApp } from "./types";
interface AppObjects {
    app: DiscoveredApp;
    objects: ALObject[];
}
/**
 * Finds object IDs declared in more than one file among apps that share consumption: one app, or
 * all apps of one pool. Several declarations in one file are not a collision.
 */
export declare function findCollisions(appObjects: AppObjects[]): Collision[];
export {};
//# sourceMappingURL=collisions.d.ts.map