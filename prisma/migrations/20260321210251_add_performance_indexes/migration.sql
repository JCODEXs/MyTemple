-- CreateIndex
CREATE INDEX "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyLog_userId_idx" ON "DailyLog"("userId");

-- CreateIndex
CREATE INDEX "HydrationLog_userId_date_idx" ON "HydrationLog"("userId", "date");

-- CreateIndex
CREATE INDEX "NutritionPlan_userId_startDate_idx" ON "NutritionPlan"("userId", "startDate");

-- CreateIndex
CREATE INDEX "PlanDay_planId_date_idx" ON "PlanDay"("planId", "date");

-- CreateIndex
CREATE INDEX "PlanDay_date_idx" ON "PlanDay"("date");

-- CreateIndex
CREATE INDEX "Recipe_userId_updatedAt_idx" ON "Recipe"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");

-- CreateIndex
CREATE INDEX "RegistrationCode_createdByCoachId_type_usedAt_idx" ON "RegistrationCode"("createdByCoachId", "type", "usedAt");

-- CreateIndex
CREATE INDEX "WeightLog_userId_date_idx" ON "WeightLog"("userId", "date");

-- CreateIndex
CREATE INDEX "Workout_userId_date_idx" ON "Workout"("userId", "date");

-- CreateIndex
CREATE INDEX "Workout_dailyLogId_idx" ON "Workout"("dailyLogId");
