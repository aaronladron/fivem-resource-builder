import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createResource } from "../src/create-resource.ts";

function prepareDirectory(t) {
    const previousDirectory = process.cwd();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fivem-resource-builder-errors-"));
    process.chdir(directory);
    t.after(() => {
        t.mock.restoreAll();
        process.chdir(previousDirectory);
        fs.rmSync(directory, { recursive: true, force: true });
    });
    return directory;
}

test("préserve un fichier existant et explique le conflit", (t) => {
    prepareDirectory(t);
    fs.writeFileSync("police_job", "à conserver");
    assert.throws(() => createResource("police_job", "esx"), /existe déjà/);
    assert.equal(fs.readFileSync("police_job", "utf8"), "à conserver");
});

for (const code of ["EACCES", "EPERM"]) {
    test(`explique le refus de permission ${code} sans tenter de nettoyage`, (t) => {
        const directory = prepareDirectory(t);
        const error = Object.assign(new Error("access denied"), { code });
        t.mock.method(fs, "mkdirSync", () => { throw error; });
        const cleanup = t.mock.method(fs, "rmSync");
        assert.throws(() => createResource("police_job", "esx"), (failure) => {
            assert.match(failure.message, /Permissions insuffisantes/);
            assert.equal(failure.cause, error);
            return true;
        });
        assert.equal(cleanup.mock.callCount(), 0);
        assert.deepEqual(fs.readdirSync(directory), []);
    });
}

for (const file of ["fxmanifest.lua", "client/main.lua", "server/main.lua"]) {
    test(`nettoie la ressource si l'écriture de ${file} échoue`, (t) => {
        const directory = prepareDirectory(t);
        fs.writeFileSync("existing.txt", "à conserver");
        const writeFile = fs.writeFileSync;
        t.mock.method(fs, "writeFileSync", (filename, ...args) => {
            if (filename === path.join("police_job", file)) {
                throw Object.assign(new Error("disk full"), { code: "ENOSPC" });
            }
            return writeFile(filename, ...args);
        });
        assert.throws(() => createResource("police_job", "qbcore"), /Espace disque insuffisant/);
        assert.deepEqual(fs.readdirSync(directory), ["existing.txt"]);
        assert.equal(fs.readFileSync("existing.txt", "utf8"), "à conserver");
    });
}

test("nettoie la ressource si la création d'un sous-dossier échoue", (t) => {
    const directory = prepareDirectory(t);
    const mkdir = fs.mkdirSync;
    t.mock.method(fs, "mkdirSync", (filename, ...args) => {
        if (filename === path.join("police_job", "server")) {
            throw Object.assign(new Error("access denied"), { code: "EACCES" });
        }
        return mkdir(filename, ...args);
    });
    assert.throws(() => createResource("police_job", "esx"), /Permissions insuffisantes/);
    assert.deepEqual(fs.readdirSync(directory), []);
});

test("signale un nettoyage échoué et conserve les deux causes", (t) => {
    prepareDirectory(t);
    const writeError = Object.assign(new Error("disk full"), { code: "ENOSPC" });
    const cleanupError = Object.assign(new Error("access denied"), { code: "EACCES" });
    t.mock.method(fs, "writeFileSync", () => { throw writeError; });
    t.mock.method(fs, "rmSync", () => { throw cleanupError; });
    assert.throws(() => createResource("police_job", "esx"), (error) => {
        assert.match(error.message, /Espace disque insuffisant/);
        assert.match(error.message, /nettoyage a échoué/);
        assert.match(error.message, /police_job/);
        assert.deepEqual(error.cause.errors, [writeError, cleanupError]);
        return true;
    });
    assert.ok(fs.statSync("police_job").isDirectory());
});

test("conserve le détail d'une erreur inattendue et nettoie la ressource", (t) => {
    const directory = prepareDirectory(t);
    t.mock.method(fs, "writeFileSync", () => { throw new Error("panne simulée"); });
    assert.throws(() => createResource("police_job", "standalone"), /Impossible de créer.*panne simulée/);
    assert.deepEqual(fs.readdirSync(directory), []);
});
