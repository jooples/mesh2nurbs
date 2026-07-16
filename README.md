# mesh2nurbs

Text-to-NURBS 3D model generation. Users describe what they want, and the
site turns it into a NURBS surface model via two pipeline steps:

1. **Tencent Cloud Hunyuan3D** — text prompt → mesh
2. **Our own mesh-to-NURBS pipeline** — mesh → NURBS surfaces

Neither integration is built yet. This repo currently ships the site
scaffold — pages, layout, and the placeholder pipeline seam — so both can be
dropped in without reworking the frontend.

## Structure

- `app/page.tsx` — homepage (hero + CTA, gallery preview)
- `app/create/page.tsx` — the generation form, posts to `/api/generate`
- `app/gallery/page.tsx` — example models grid
- `app/api/generate/route.ts` — pipeline entry point; currently mocked
- `lib/tencentHunyuan.ts` — Hunyuan3D integration stub (text → mesh)
- `lib/meshToNurbs.ts` — mesh-to-NURBS pipeline stub (mesh → NURBS)
- `components/MeshViewer.tsx` — react-three-fiber viewer; renders a
  placeholder mesh until real model URLs are available
- `.env.local.example` — env vars needed once Hunyuan3D is wired up

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
