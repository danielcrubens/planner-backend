-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "invite_used_at" TIMESTAMPTZ(6),
ADD COLUMN     "invited_by_id" UUID;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

