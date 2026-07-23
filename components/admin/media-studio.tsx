"use client";
import{useState}from"react";import{MediaUploader,type UploadedAsset}from"@/components/media-uploader";import{MediaLibrary,type MediaAsset}from"./media-library";
export function MediaStudio({assets,isAdmin}:{assets:MediaAsset[];isAdmin:boolean}){const[items,setItems]=useState(assets);return <><MediaUploader isAdmin={isAdmin} onUploaded={(asset:UploadedAsset)=>setItems(current=>[asset as MediaAsset,...current])}/><MediaLibrary assets={items} isAdmin={isAdmin} onChange={setItems}/></>}
