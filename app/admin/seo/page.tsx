import { requireRole } from "@/lib/auth/require-role";
import { saveSeo } from "../actions";

type SeoItem={path:string;title:string|null;description:string|null;canonical_url:string|null;share_asset_id:string|null;indexable:boolean};
type Asset={id:string;display_name:string};

export default async function SeoAdmin(){
  const{supabase}=await requireRole(["editor","admin"]);
  const[{data},{data:assets}]=await Promise.all([
    supabase.from("seo_metadata").select("path,title,description,canonical_url,share_asset_id,indexable").order("path"),
    supabase.from("media_assets").select("id,display_name").eq("bucket","public-media").is("archived_at",null).like("mime_type","image/%").order("display_name"),
  ]);
  return <><header className="admin-header"><div><span className="section-kicker">BÚSQUEDA Y REDES</span><h1>SEO</h1><p>Edita títulos, descripciones, imágenes sociales e indexación por ruta.</p></div></header><section className="section-editor"><div className="admin-table">{data?.length?data.map(item=><SeoForm key={item.path} item={item as SeoItem} assets={assets||[]}/>):<div className="admin-empty"><h2>Sin metadata personalizada.</h2><p>Las páginas utilizan los valores generales hasta que agregues una configuración.</p></div>}</div><SeoForm assets={assets||[]}/></section></>;
}

function SeoForm({item,assets}:{item?:SeoItem;assets:Asset[]}){
  return <form action={saveSeo} className="settings-card"><span>{item?`EDITAR ${item.path}`:"NUEVA METADATA"}</span><label>Ruta<input name="path" placeholder="/musica" defaultValue={item?.path||""} required/></label><label>Título SEO<input name="title" maxLength={65} defaultValue={item?.title||""}/></label><label>Descripción<textarea name="description" rows={4} maxLength={170} defaultValue={item?.description||""}/></label><label>Imagen para compartir<select name="shareAssetId" defaultValue={item?.share_asset_id||""}><option value="">Imagen general</option>{assets.map(asset=><option value={asset.id} key={asset.id}>{asset.display_name}</option>)}</select></label><label>Canonical<input name="canonical" type="url" defaultValue={item?.canonical_url||""}/></label><label className="checkbox"><input name="indexable" type="checkbox" defaultChecked={item?.indexable??true}/> Permitir indexación</label><div className="seo-preview"><small>VISTA PREVIA</small><strong>{item?.title||"Título de la página | IAMJOSHWA"}</strong><p>{item?.description||"Descripción aproximada para buscadores y redes sociales."}</p></div><button className="button primary">Guardar SEO</button></form>;
}
