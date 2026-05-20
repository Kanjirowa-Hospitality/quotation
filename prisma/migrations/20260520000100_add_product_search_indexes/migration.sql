-- Speed up product/category search and the joins used by paginated catalog APIs.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Category_name_idx" ON "Category"("name");
CREATE INDEX IF NOT EXISTS "Category_createdAt_idx" ON "Category"("createdAt");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_createdAt_idx" ON "ProductVariant"("createdAt");
CREATE INDEX IF NOT EXISTS "SaleOption_variantId_idx" ON "SaleOption"("variantId");
CREATE INDEX IF NOT EXISTS "SaleOption_createdAt_idx" ON "SaleOption"("createdAt");

CREATE INDEX IF NOT EXISTS "Category_name_trgm_idx" ON "Category" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Category_slug_trgm_idx" ON "Category" USING GIN ("slug" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Category_description_trgm_idx" ON "Category" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductVariant_description_trgm_idx" ON "ProductVariant" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductVariant_size_trgm_idx" ON "ProductVariant" USING GIN ("size" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductVariant_weight_trgm_idx" ON "ProductVariant" USING GIN ("weight" gin_trgm_ops);
