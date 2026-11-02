import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { storagePut } from "./storage";

const temporaryDirectories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Coolify local storage", () => {
  it("stores the uploaded bytes under UPLOAD_DIR and returns a local public URL", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "vipilan-storage-test-"));
    temporaryDirectories.push(directory);
    vi.stubEnv("AUTH_PROVIDER", "local");
    vi.stubEnv("STORAGE_PROVIDER", "local");
    vi.stubEnv("UPLOAD_DIR", directory);

    const contents = Buffer.from("test-image-content");
    const result = await storagePut("vip-ilan/listings/test.webp", contents, "image/webp");
    const saved = await readFile(path.join(directory, result.key));

    expect(result.url).toBe(`/uploads/${result.key}`);
    expect(saved.equals(contents)).toBe(true);
  });
});
