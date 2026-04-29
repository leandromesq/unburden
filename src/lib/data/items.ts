import championsItems from "@/data/champions-items.json";
import type { ItemEntry } from "@/lib/types";

const itemData = championsItems as ItemEntry[];

export const allowedItemIds = new Set(itemData.map((entry) => entry.id));
export const itemDisplayById = new Map(
  itemData.map((entry) => [entry.id, entry.name]),
);
