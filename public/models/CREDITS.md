# Modelos 3D — créditos e licenças

Os modelos abaixo são embutidos no app (em `public/models/`) para funcionar **offline**.

## head.glb — cabeça humana realista (intubação)
- **Modelo:** "Lee Perry-Smith" (head scan)
- **Autor:** Infinite-Realities (https://www.ir-ltd.net/)
- **Licença:** Creative Commons Attribution 3.0 (CC-BY 3.0) — uso permitido com atribuição.
- **Origem:** repositório three.js (`examples/models/gltf/LeePerrySmith/`).

---

## Como adicionar modelos de anatomia realista

1. Baixe um modelo `.glb` com licença adequada (preferir **CC0** ou **CC-BY**).
   Fontes: Sketchfab (filtrar Downloadable + licença), Artec 3D, Free3D, Meshy.
2. Coloque o arquivo em `public/models/` (ex.: `ribcage.glb`).
3. Registre-o em `src/data/models.js` (URL + crédito/licença).
4. Aponte a cena do procedimento para o modelo via o componente `GLBModel`.

> Mantenha a atribuição aqui para qualquer modelo CC-BY. Não comite modelos com
> licença que proíba redistribuição (ex.: muitos pacotes "free" de marketplaces).
