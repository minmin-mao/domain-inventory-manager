export const normalizeProjectName = (value: string | null | undefined) =>
  typeof value === "string"
    ? value.toLowerCase().trim().replace(/[\s_-]+/g, "")
    : "";

export const isNormalizedProjectMatch = (
  recordedProject: string | null | undefined,
  searchProject: string | null | undefined
) => {
  const normalizedRecorded = normalizeProjectName(recordedProject);
  const normalizedSearch = normalizeProjectName(searchProject);

  if (!normalizedRecorded || !normalizedSearch) {
    return false;
  }

  return (
    normalizedRecorded.includes(normalizedSearch) ||
    normalizedSearch.includes(normalizedRecorded)
  );
};
