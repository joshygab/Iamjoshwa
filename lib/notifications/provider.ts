import "server-only";
export type NotificationMessage={to:string;subject?:string;html?:string;text:string;idempotencyKey:string};
export interface NotificationProvider{send(message:NotificationMessage):Promise<{id:string;status:"sent"|"skipped"}>}
export class DisabledWhatsAppProvider implements NotificationProvider{async send(){return{id:"disabled",status:"skipped" as const}}}
