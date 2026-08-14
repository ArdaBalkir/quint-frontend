const hasRegistrationValues = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined && value !== "";
};

export const getRegistrationQuantificationSummary = (registrationContent) => {
  const sections = Array.isArray(registrationContent?.sections)
    ? registrationContent.sections
    : Array.isArray(registrationContent?.slices)
      ? registrationContent.slices
      : [];

  const quantifiableImages = sections.filter(
    (section) =>
      hasRegistrationValues(section?.ouv) ||
      hasRegistrationValues(section?.anchoring) ||
      hasRegistrationValues(section?.markers),
  ).length;

  return {
    totalImages: sections.length,
    quantifiableImages,
    missingRegistrationImages: sections.length - quantifiableImages,
  };
};
