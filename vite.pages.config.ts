import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,process.cwd(),''),...process.env};
 const base=mode==='production'?'/sekhonmarathon_suratgarh_2026':'';
 return {base:base+'/',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},css:{postcss:{plugins:[tailwindcss()]}},define:{'process.env.NEXT_PUBLIC_BASE_PATH':JSON.stringify(base),'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL||''),'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'')},build:{outDir:'dist',emptyOutDir:true},server:{port:3000,strictPort:true}};
});
