import "server-only";
import { createSignedUnsubscribeToken, verifySignedUnsubscribeToken } from "./unsubscribe-token";

function secret(){const value=process.env.FINGERPRINT_SALT||process.env.CRON_SECRET;if(!value)throw new Error("Unsubscribe secret not configured");return value}
export function createUnsubscribeToken(userId:string,expiresInSeconds=60*60*24*30){return createSignedUnsubscribeToken(userId,secret(),Math.floor(Date.now()/1000),expiresInSeconds)}
export function verifyUnsubscribeToken(token:string){return verifySignedUnsubscribeToken(token,secret())}
