-- CreateTable
CREATE TABLE "belt_levels" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "requiredTrainings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belt_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_belts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "beltLevelId" TEXT,
    "beltName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "awardedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_belts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "belt_levels_courseId_order_idx" ON "belt_levels"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "belt_levels_courseId_name_key" ON "belt_levels"("courseId", "name");

-- CreateIndex
CREATE INDEX "student_belts_studentId_idx" ON "student_belts"("studentId");

-- CreateIndex
CREATE INDEX "student_belts_beltLevelId_idx" ON "student_belts"("beltLevelId");

-- AddForeignKey
ALTER TABLE "belt_levels" ADD CONSTRAINT "belt_levels_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_belts" ADD CONSTRAINT "student_belts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_belts" ADD CONSTRAINT "student_belts_beltLevelId_fkey" FOREIGN KEY ("beltLevelId") REFERENCES "belt_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_belts" ADD CONSTRAINT "student_belts_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
