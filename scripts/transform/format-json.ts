type FormatJsonOptions = {
  compactArrayKeys?: ReadonlySet<string>;
  compactArrayMaxLengthByKey?: ReadonlyMap<string, number>;
};

function isPrimitiveJsonValue(value: unknown) {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function stringifyPrimitive(value: unknown) {
  return JSON.stringify(value);
}

export function formatJsonWithCompactArrays(
  value: unknown,
  options: FormatJsonOptions = {},
  depth = 0,
  key: string | null = null,
): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    const compactMaxLength = key
      ? options.compactArrayMaxLengthByKey?.get(key)
      : undefined;
    const canCompactByKey = key && options.compactArrayKeys?.has(key);
    const canCompactByLength =
      compactMaxLength !== undefined && value.length <= compactMaxLength;

    if ((canCompactByKey || canCompactByLength) && value.every(isPrimitiveJsonValue)) {
      return `[${value.map(stringifyPrimitive).join(", ")}]`;
    }

    return [
      "[",
      value
        .map(
          (entry) =>
            `${nextIndent}${formatJsonWithCompactArrays(
              entry,
              options,
              depth + 1,
            )}`,
        )
        .join(",\n"),
      `${indent}]`,
    ].join("\n");
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(
      ([, entryValue]) => entryValue !== undefined,
    );

    if (entries.length === 0) {
      return "{}";
    }

    return [
      "{",
      entries
        .map(
          ([key, entryValue]) =>
            `${nextIndent}${JSON.stringify(key)}: ${formatJsonWithCompactArrays(
              entryValue,
              options,
              depth + 1,
              key,
            )}`,
        )
        .join(",\n"),
      `${indent}}`,
    ].join("\n");
  }

  return stringifyPrimitive(value);
}
