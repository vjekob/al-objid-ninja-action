import { ALObject, ConsumptionInfo } from "./types";
/**
 * Build consumption info from parsed AL objects.
 * Matches updateActualConsumption() from the ninja-extension's ObjectIds.ts exactly.
 */
export declare function buildConsumption(objects: ALObject[]): ConsumptionInfo;
/**
 * Merge consumption from multiple apps into a single consumption map.
 * Used for pooled apps — all apps in a pool contribute to the same consumption.
 */
export declare function mergeConsumption(consumptions: ConsumptionInfo[]): ConsumptionInfo;
//# sourceMappingURL=consumption.d.ts.map