-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN "publicReplyId" TEXT;
ALTER TABLE "page_comments" ADD COLUMN "publicRepliedAt" TIMESTAMP(3);
