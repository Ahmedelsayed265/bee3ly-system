-- CreateTable
CREATE TABLE "page_comments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_comments_commentId_key" ON "page_comments"("commentId");

-- CreateIndex
CREATE INDEX "page_comments_businessId_idx" ON "page_comments"("businessId");

-- CreateIndex
CREATE INDEX "page_comments_postId_idx" ON "page_comments"("postId");

-- CreateIndex
CREATE INDEX "page_comments_customerId_idx" ON "page_comments"("customerId");

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
