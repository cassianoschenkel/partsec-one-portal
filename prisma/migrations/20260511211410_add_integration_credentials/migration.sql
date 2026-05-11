-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "integrationConfigId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_credentials_integrationConfigId_idx" ON "integration_credentials"("integrationConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_integrationConfigId_key_key" ON "integration_credentials"("integrationConfigId", "key");

-- AddForeignKey
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integrationConfigId_fkey" FOREIGN KEY ("integrationConfigId") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
