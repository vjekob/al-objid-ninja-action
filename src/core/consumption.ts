import { ALObject, ConsumptionInfo } from "./types";

/**
 * Build consumption info from parsed AL objects.
 * Matches updateActualConsumption() from the ninja-extension's ObjectIds.ts exactly.
 */
export function buildConsumption(objects: ALObject[]): ConsumptionInfo {
    const consumption: ConsumptionInfo = {};

    for (const object of objects) {
        let { type, id } = object;
        if (!id) continue;

        if (!consumption[type]) consumption[type] = [];
        consumption[type].push(id);

        if (object.fields) {
            const fieldType = `${type}_${id}`;
            consumption[fieldType] = [];
            for (const field of object.fields) {
                consumption[fieldType].push(field.id);
            }
            continue;
        }

        if (object.values) {
            const valueType = `${type}_${id}`;
            consumption[valueType] = [];
            for (const value of object.values) {
                consumption[valueType].push(value.id);
            }
        }
    }

    return consumption;
}

/**
 * Merge consumption from multiple apps into a single consumption map.
 * Used for pooled apps — all apps in a pool contribute to the same consumption.
 */
export function mergeConsumption(consumptions: ConsumptionInfo[]): ConsumptionInfo {
    const merged: ConsumptionInfo = {};

    for (const consumption of consumptions) {
        for (const [type, ids] of Object.entries(consumption)) {
            if (!merged[type]) merged[type] = [];
            merged[type].push(...ids);
        }
    }

    return merged;
}
