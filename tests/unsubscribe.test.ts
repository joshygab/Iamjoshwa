import { describe, expect, it } from "vitest";
import { createSignedUnsubscribeToken, verifySignedUnsubscribeToken } from "@/lib/email/unsubscribe-token";

const userId="123e4567-e89b-12d3-a456-426614174000";
const secret="a-test-secret-that-never-leaves-this-test";
const now=1_800_000_000;

describe("unsubscribe links",()=>{
  it("accepts a valid signed link",()=>{
    const token=createSignedUnsubscribeToken(userId,secret,now,3600);
    expect(verifySignedUnsubscribeToken(token,secret,now)).toEqual({userId,expires:now+3600});
  });

  it("rejects modified, expired, or differently signed links",()=>{
    const token=createSignedUnsubscribeToken(userId,secret,now,60);
    expect(verifySignedUnsubscribeToken(`${token}x`,secret,now)).toBeNull();
    expect(verifySignedUnsubscribeToken(token,secret,now+61)).toBeNull();
    expect(verifySignedUnsubscribeToken(token,"another-secret",now)).toBeNull();
  });
});
