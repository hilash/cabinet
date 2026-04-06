function parseStableSemver(input: string): [number, number, number] | null {
  const match = input.trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10),
    Number.parseInt(match[3], 10),
  ];
}

export function compareVersions(left: string, right: string): number {
  const leftParts = parseStableSemver(left);
  const rightParts = parseStableSemver(right);

  if (!leftParts || !rightParts) {
    return left.localeCompare(right);
  }

  for (let i = 0; i < 3; i += 1) {
    if (leftParts[i] !== rightParts[i]) {
      return leftParts[i] > rightParts[i] ? 1 : -1;
    }
  }
  return 0;
}

export function isStableVersion(version: string): boolean {
  return parseStableSemver(version) !== null;
}

