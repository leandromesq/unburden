import moves from "@/data/moves.gen9.json";
import type { MoveEntry } from "@/lib/types";

export const moveData = moves as MoveEntry[];
export const moveById = new Map(moveData.map((entry) => [entry.id, entry]));
