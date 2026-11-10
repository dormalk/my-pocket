export type Agorot = number;
export function assertAgorot(value: number): asserts value is Agorot { if (!Number.isSafeInteger(value) || value < 0) throw new Error("סכום חייב להיות מספר שלם ולא שלילי באגורות"); }
export function formatIls(agorot: Agorot): string { assertAgorot(agorot); return new Intl.NumberFormat("he-IL", {style:"currency",currency:"ILS",maximumFractionDigits:2}).format(agorot/100); }
