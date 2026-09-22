-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "page_comments" ADD COLUMN "privateRepliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "page_comments_conversationId_idx" ON "page_comments"("conversationId");

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
