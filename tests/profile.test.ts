import { describe, expect, it } from "vitest";
import { onboardingSchema, preferencesSchema, profileFormData } from "@/lib/validation/profile";

const valid = {
  name: "Joshua",
  alias: "Josh",
  city: "Ciudad de México",
  country: "México",
  project: "iamjoshwa",
  channel: "email",
  genres: ["House", "Tech House"],
  communications: true,
  events: true,
  releases: true,
  presaves: true,
  sets: true,
  tickets: true,
  secret: false,
  exclusive: true,
  iamjoshwa: true,
  afterluv: false,
  cityBased: true,
} as const;

describe("profile validation", () => {
  it("accepts a complete onboarding profile", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown genres and unsupported contact channels", () => {
    expect(onboardingSchema.safeParse({ ...valid, genres: ["Unknown"] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, channel: "whatsapp" }).success).toBe(false);
  });

  it("requires a useful city and country", () => {
    expect(preferencesSchema.safeParse({ ...valid, city: "X" }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...valid, country: "" }).success).toBe(false);
  });

  it("normalizes checkbox values from FormData", () => {
    const data = new FormData();
    data.set("name", "  Joshua  ");
    data.set("city", "CDMX");
    data.set("country", "México");
    data.set("project", "afterluv");
    data.set("communications", "on");
    data.append("genres", "Hard Techno");
    const parsed = profileFormData(data);
    expect(parsed.communications).toBe(true);
    expect(parsed.events).toBe(false);
    expect(parsed.project).toBe("afterluv");
    expect(parsed.genres).toEqual(["Hard Techno"]);
  });
});
