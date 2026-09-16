import { describe, expect, it } from "vitest";

import {
  transformArchitectureMd,
  transformBuildInfoTs,
  transformDockerfile,
  transformPackageJson,
} from "./bump-version.mjs";

const FROM = "0.1.0";
const TO = "1.0.0";

describe("version bump transforms", () => {
  it("updates the package.json version field", () => {
    const content = '{\n  "name": "mitch-dojo",\n  "version": "0.1.0",\n}\n';
    const updated = transformPackageJson(content, FROM, TO);
    expect(updated).toContain('"version": "1.0.0",');
    expect(updated).not.toContain('"version": "0.1.0"');
  });

  it("updates the Dockerfile build-info version", () => {
    const content = `RUN node -e "fs.writeFileSync('.next/build-info.json', JSON.stringify({ version: '0.1.0', commit, buildTime }));"`;
    const updated = transformDockerfile(content, FROM, TO);
    expect(updated).toContain("version: '1.0.0'");
    expect(updated).not.toContain("version: '0.1.0'");
  });

  it("updates the lib/build-info.ts fallback version", () => {
    const content = `  version: fromFile?.version ?? "0.1.0",`;
    const updated = transformBuildInfoTs(content, FROM, TO);
    expect(updated).toContain('version: fromFile?.version ?? "1.0.0"');
  });

  it("updates the ARCHITECTURE.md version line", () => {
    const content = "> **Version:** 0.1.0 (Phase 5b)\n";
    expect(transformArchitectureMd(content, FROM, TO)).toBe(
      "> **Version:** 1.0.0 (Phase 5b)\n",
    );
  });

  it("throws when the expected old version is missing", () => {
    expect(() =>
      transformPackageJson('{"version": "9.9.9"}', FROM, TO),
    ).toThrow("package.json version field");
    expect(() => transformDockerfile("nothing here", FROM, TO)).toThrow(
      "Dockerfile build-info version",
    );
    expect(() =>
      transformArchitectureMd("> **Version:** 9.9.9", FROM, TO),
    ).toThrow("ARCHITECTURE.md version line");
  });

  it("replaces every occurrence of the pattern, not just the first", () => {
    const content =
      '  "version": "0.1.0",\n  "other": { "version": "0.1.0", },\n';
    expect(transformPackageJson(content, FROM, TO)).toBe(
      '  "version": "1.0.0",\n  "other": { "version": "1.0.0", },\n',
    );
  });
});
