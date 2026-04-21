import Image from "next/image";

const AVAILABLE_MOVE_TYPE_ICONS = new Set([
  "bug",
  "dark",
  "dragon",
  "electric",
  "fairy",
  "fighting",
  "fire",
  "flying",
  "ghost",
  "grass",
  "ground",
  "ice",
  "normal",
  "poison",
  "psychic",
  "rock",
  "steel",
  "water",
]);

function formatTypeLabel(type: string) {
  return `${type.slice(0, 1).toUpperCase()}${type.slice(1)} type`;
}

export function resolveMoveTypeIconKey(type: string | null | undefined) {
  const normalizedType = type?.trim().toLowerCase() ?? "";
  return AVAILABLE_MOVE_TYPE_ICONS.has(normalizedType) ? normalizedType : null;
}

interface MoveTypeIconProps {
  type: string | null | undefined;
  size?: number;
  className?: string;
}

export function MoveTypeIcon({
  type,
  size = 14,
  className,
}: MoveTypeIconProps) {
  const resolvedType = resolveMoveTypeIconKey(type);

  if (!resolvedType) {
    return null;
  }

  return (
    <Image
      src={`/pkmn_types/${resolvedType}.svg`}
      alt={formatTypeLabel(resolvedType)}
      width={size}
      height={size}
      className={className}
    />
  );
}
