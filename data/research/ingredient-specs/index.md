---
title: Ingredient Specs
created: '2026-04-03T00:00:00.000Z'
modified: '2026-04-03T00:00:00.000Z'
tags:
  - research
  - engineering
  - ingredients
order: 3
---
# Ingredient Specs

Technical specifications for sourcing, nutrition labeling, and allergen compliance. This is the reference doc for both our supply chain team and the e-commerce storefront.

## Cocoa Sourcing Standards

All cocoa must meet these minimum requirements:

1. **Origin certification** — single-origin or named blend only
2. **Fair trade** — Rainforest Alliance or equivalent certification
3. **Cocoa butter content** — minimum 32% for dark, 28% for milk variants
4. **Heavy metal testing** — cadmium below 0.3 mg/kg per EU regulation
5. **Flavor profile scoring** — minimum 7/10 on internal tasting panel

> **FDA Note:** Per 21 CFR 163, any product labeled "chocolate" must contain chocolate liquor. Our "Oat Milk Velvet" uses cocoa butter + cocoa powder and is labeled "chocolatey" to comply. Always check labeling language with legal before launch.

## Nutrition Label Schema

Our storefront API serves nutrition data in this format. Keep product records in sync with the <a data-wiki-link="true" data-page-name="Product Catalog" href="#page:catalog" class="wiki-link">Product Catalog</a>.

```json
{
  "product_id": "salted-caramel-crunch",
  "serving_size": "40g",
  "servings_per_container": 1,
  "calories": 210,
  "nutrients": {
    "total_fat": { "amount": "14g", "daily_value": "18%" },
    "saturated_fat": { "amount": "8g", "daily_value": "40%" },
    "sodium": { "amount": "95mg", "daily_value": "4%" },
    "total_carbs": { "amount": "20g", "daily_value": "7%" },
    "dietary_fiber": { "amount": "2g", "daily_value": "7%" },
    "total_sugars": { "amount": "14g", "added_sugars": "12g" },
    "protein": { "amount": "3g", "daily_value": "5%" }
  },
  "allergens": ["milk", "soy"],
  "certifications": ["fair-trade", "non-gmo"]
}
```

## Allergen Tracking API

The storefront uses this endpoint to filter products by allergen. This is a critical path for customer safety.

```typescript
interface AllergenFilter {
  exclude: string[];  // e.g. ["peanuts", "tree-nuts", "milk"]
  include_only?: string[];  // strict mode: only show products with THESE ingredients
}

async function filterByAllergens(
  products: Product[],
  filter: AllergenFilter
): Promise<Product[]> {
  return products.filter(product => {
    const hasExcluded = product.allergens.some(a => 
      filter.exclude.includes(a)
    );
    if (hasExcluded) return false;
    
    if (filter.include_only) {
      return filter.include_only.every(ing => 
        product.ingredients.includes(ing)
      );
    }
    return true;
  });
}
```

## Quality Checkpoints

Every new batch goes through these gates before shipping:

1. **Incoming inspection** — verify supplier COA (Certificate of Analysis)
2. **Temper test** — snap test and gloss check on sample bars
3. **Taste panel** — 3-person blind tasting, score ≥ 7/10 required
4. **Label review** — nutrition facts + allergen declarations match formula
5. **Shelf life validation** — accelerated aging test for 12-month shelf life claim
6. **Packaging seal test** — vacuum and visual inspection for wrapper integrity

See <a data-wiki-link="true" data-page-name="Operations" href="#page:operations" class="wiki-link">Operations</a> for supplier contact details and lead times.
