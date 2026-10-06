-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "invite_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "invite_token_hash" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "participants_invite_token_hash_key" ON "participants"("invite_token_hash");
