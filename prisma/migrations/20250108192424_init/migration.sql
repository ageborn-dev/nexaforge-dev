-- CreateTable
CREATE TABLE "GeneratedApp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SavedApp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "appId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "GeneratedApp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "responseTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "utilizationPercentage" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analytics_appId_fkey" FOREIGN KEY ("appId") REFERENCES "GeneratedApp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "content" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "allowedViews" INTEGER,
    "remainingViews" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedCode_appId_fkey" FOREIGN KEY ("appId") REFERENCES "GeneratedApp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GeneratedApp_id_idx" ON "GeneratedApp"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SavedApp_appId_key" ON "SavedApp"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_appId_key" ON "Analytics"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedCode_appId_key" ON "SharedCode"("appId");

-- CreateIndex
CREATE INDEX "SharedCode_appId_idx" ON "SharedCode"("appId");
