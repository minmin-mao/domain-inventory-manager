export const normalizeProjectName = (value: string | null | undefined) =>
  typeof value === "string"
    ? value.toLowerCase().trim().replace(/[\s_-]+/g, "")
    : "";

const normalizeProjectDisplay = (value: string | null | undefined) =>
  typeof value === "string"
    ? value.toLowerCase().trim().replace(/\s+/g, " ")
    : "";

export type ProjectMatchKind = "exact" | "normalized" | "prefix" | "none";

export const getProjectMatchKind = (
  recordedProject: string | null | undefined,
  searchProject: string | null | undefined
): ProjectMatchKind => {
  const recordedDisplay = normalizeProjectDisplay(recordedProject);
  const searchDisplay = normalizeProjectDisplay(searchProject);
  const normalizedRecorded = normalizeProjectName(recordedProject);
  const normalizedSearch = normalizeProjectName(searchProject);

  if (!normalizedRecorded || !normalizedSearch) {
    return "none";
  }

  // Exact display match: case and repeated-space differences are ignored,
  // but semantic suffixes such as "HM" are preserved.
  if (recordedDisplay === searchDisplay) {
    return "exact";
  }

  // Normalized separator match: "Flexi HM", "Flexi-HM", and "flexi_hm"
  // are equivalent, while "Flexi" and "Flexi HM" remain different.
  if (normalizedRecorded === normalizedSearch) {
    return "normalized";
  }

  // Prefix fallback exists only for fuzzy suggestion fallback. The suggest
  // route filters this out whenever exact/normalized project matches exist.
  if (
    normalizedRecorded.startsWith(normalizedSearch) ||
    normalizedSearch.startsWith(normalizedRecorded)
  ) {
    return "prefix";
  }

  return "none";
};

export const isNormalizedProjectMatch = (
  recordedProject: string | null | undefined,
  searchProject: string | null | undefined
) => {
  return getProjectMatchKind(recordedProject, searchProject) !== "none";
};
