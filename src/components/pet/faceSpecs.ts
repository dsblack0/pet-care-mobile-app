// Per-species look for the animated pet face. Add a species by adding an entry.
export type FaceSpec = {
  fur: string;
  halo: string; // pale tint of the fur, used behind the face
  ear: string;
  earInner: string;
  muzzle: string;
  nose: string;
  eye: string;
  brow: string;
  earStyle: "floppy" | "pointed" | "round";
  pupil: "round" | "slit";
  muzzleStyle: "snout" | "pads";
  whiskers: boolean;
};

const dog: FaceSpec = {
  fur: "#E7B877",
  halo: "#FCEBD2",
  ear: "#C48A4C",
  earInner: "#C48A4C",
  muzzle: "#F7E0BA",
  nose: "#3B2B2B",
  eye: "#2B2024",
  brow: "#A9733D",
  earStyle: "floppy",
  pupil: "round",
  muzzleStyle: "snout",
  whiskers: false,
};

const cat: FaceSpec = {
  fur: "#B8AEA4",
  halo: "#EEEAE6",
  ear: "#B8AEA4",
  earInner: "#F2B8C6",
  muzzle: "#EFE9E3",
  nose: "#E58FA5",
  eye: "#9BC46B",
  brow: "#7D746C",
  earStyle: "pointed",
  pupil: "slit",
  muzzleStyle: "pads",
  whiskers: true,
};

// Used for any species without its own entry.
const generic: FaceSpec = {
  fur: "#D9C7B0",
  halo: "#F4ECE1",
  ear: "#C7B299",
  earInner: "#EBC9C2",
  muzzle: "#F1E6D6",
  nose: "#4A3A3A",
  eye: "#2B2024",
  brow: "#A08B72",
  earStyle: "round",
  pupil: "round",
  muzzleStyle: "snout",
  whiskers: false,
};

const SPECS: Record<string, FaceSpec> = { dog, cat };

export function getFaceSpec(species: string): FaceSpec {
  return SPECS[species.trim().toLowerCase()] ?? generic;
}
