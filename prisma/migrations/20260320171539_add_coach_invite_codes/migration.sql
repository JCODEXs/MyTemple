-- CreateTable
CREATE TABLE "CoachInviteCode" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachInviteCode_code_key" ON "CoachInviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoachInviteCode_usedById_key" ON "CoachInviteCode"("usedById");

-- AddForeignKey
ALTER TABLE "CoachInviteCode" ADD CONSTRAINT "CoachInviteCode_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachInviteCode" ADD CONSTRAINT "CoachInviteCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
