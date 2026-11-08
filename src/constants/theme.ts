export const colors = {
  // Warm neutrals
  background: "#FFF8EF",
  surface: "#FFFFFF",
  border: "#F0E4D4",
  text: "#2A211C",
  textMuted: "#7A6D63",

  // Purple is reserved for actions and progress
  primary: "#6B5CE7",
  primarySoft: "#EEEBFD",
  track: "#EFE7DC",

  // Warm accents
  peach: "#FFE2C8",
  butter: "#FFEFB8",
  mint: "#D6EFDC",

  challengeOuter: "#FFE2C8",

  doneBg: "#E6F4EA",
  doneText: "#2E7D4F",
  openBg: "#FDEBD8",
  openText: "#C06A1F",
  laterBg: "#EEF6EE",
  laterText: "#5B8F5B",
};

export const fonts = {
  heading: "Nunito_800ExtraBold",
  subheading: "Nunito_700Bold",
};

export const activityTint: Record<string, { bg: string; fg: string }> = {
  Feed: { bg: "#FFEFB8", fg: "#B07A00" },
  Walk: { bg: "#FFE2C8", fg: "#C06A1F" },
  Medication: { bg: "#D6EFDC", fg: "#3F8A57" },
  Play: { bg: "#EEEBFD", fg: "#6B5CE7" },
  Train: { bg: "#DDEBFA", fg: "#3D78B5" },
  Groom: { bg: "#FBE3EE", fg: "#B5527E" },
  Photo: { bg: "#D6EFDC", fg: "#3F8A57" },
  Other: { bg: "#EFE7DC", fg: "#7A6D63" },
};
