import { createHmac, timingSafeEqual } from "node:crypto";

export function createSignedUnsubscribeToken(userId:string,secret:string,nowSeconds=Math.floor(Date.now()/1000),expiresInSeconds=60*60*24*30){
  if(!secret)throw new Error("Unsubscribe secret not configured");
  const expires=nowSeconds+expiresInSeconds;
  const payload=`${userId}.${expires}`;
  const signature=createHmac("sha256",secret).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySignedUnsubscribeToken(token:string,secret:string,nowSeconds=Math.floor(Date.now()/1000)){
  if(!secret)return null;
  try{
    const decoded=Buffer.from(token,"base64url").toString("utf8");
    const[userId,expiresRaw,signature]=decoded.split(".");
    const expires=Number(expiresRaw);
    if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isInteger(expires)||expires<nowSeconds||!signature)return null;
    const expected=createHmac("sha256",secret).update(`${userId}.${expires}`).digest("base64url");
    const providedBuffer=Buffer.from(signature);
    const expectedBuffer=Buffer.from(expected);
    if(providedBuffer.length!==expectedBuffer.length||!timingSafeEqual(providedBuffer,expectedBuffer))return null;
    return{userId,expires};
  }catch{return null}
}
