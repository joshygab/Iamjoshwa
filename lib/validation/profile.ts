import { z } from "zod";

export const allowedGenres=["House","Tech House","Afro House","Latin House","Disco","Nu Disco","Reguetón","EDM","Hard Techno","Hard Trance","Hard Bounce","Euro Dance"] as const;
const base=z.object({name:z.string().trim().min(1).max(80),alias:z.string().trim().max(50).optional(),city:z.string().trim().min(2).max(120),country:z.string().trim().min(2).max(120),project:z.enum(["iamjoshwa","afterluv"]),genres:z.array(z.enum(allowedGenres)).max(20),communications:z.boolean(),events:z.boolean(),releases:z.boolean(),presaves:z.boolean(),sets:z.boolean(),tickets:z.boolean(),secret:z.boolean(),exclusive:z.boolean(),iamjoshwa:z.boolean(),afterluv:z.boolean(),cityBased:z.boolean()});
export const onboardingSchema=base.extend({channel:z.literal("email")});
export const preferencesSchema=base;

export function profileFormData(data:FormData){return{name:String(data.get("name")||""),alias:String(data.get("alias")||"")||undefined,city:String(data.get("city")||""),country:String(data.get("country")||""),project:String(data.get("project")||""),channel:String(data.get("channel")||"email"),genres:data.getAll("genres").map(String),communications:data.get("communications")==="on",events:data.get("events")==="on",releases:data.get("releases")==="on",presaves:data.get("presaves")==="on",sets:data.get("sets")==="on",tickets:data.get("tickets")==="on",secret:data.get("secret")==="on",exclusive:data.get("exclusive")==="on",iamjoshwa:data.get("iamjoshwa")==="on",afterluv:data.get("afterluv")==="on",cityBased:data.get("cityBased")==="on"}}
