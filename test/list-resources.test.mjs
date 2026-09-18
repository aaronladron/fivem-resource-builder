import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { listResources } from "../src/list-resources.ts";

const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url));
const loader = import.meta.resolve("tsx");

function prepareDirectory(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fivem-resource-builder-list-"));
    t.after(() => {
        t.mock.restoreAll();
        fs.rmSync(directory, { recursive: true, force: true });
    });
    return directory;
}

function runCli(directory, args = ["list"]) {
    const result = spawnSync(process.execPath, ["--import", loader, cli, ...args], {
        cwd: directory,
        encoding: "utf8"
    });
    assert.ifError(result.error);
    return result;
}

function addResource(directory, name) {
    const resource = path.join(directory, name);
    fs.mkdirSync(resource, { recursive: true });
    fs.writeFileSync(path.join(resource, "fxmanifest.lua"), "fx_version 'cerulean'\ngame 'gta5'\n");
}

test("liste uniquement les ressources directes, triées par nom", (t) => {
    const directory = prepareDirectory(t);
    addResource(directory, "police_job");
    addResource(directory, "ambulance_job");
    addResource(directory, "group/nested_job");
    fs.mkdirSync(path.join(directory, "empty"));
    fs.mkdirSync(path.join(directory, "invalid/fxmanifest.lua"), { recursive: true });
    fs.writeFileSync(path.join(directory, "fxmanifest.lua"), "");
    fs.writeFileSync(path.join(directory, "notes.txt"), "à conserver");

    const result = runCli(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "ambulance_job\npolice_job\n");
    assert.equal(fs.readFileSync(path.join(directory, "notes.txt"), "utf8"), "à conserver");
});

test("indique l'absence de ressources", (t) => {
    const directory = prepareDirectory(t);
    const result = runCli(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "Aucune ressource trouvée.\n");
    assert.deepEqual(fs.readdirSync(directory), []);
});

test("retrouve une ressource créée par le CLI", (t) => {
    const directory = prepareDirectory(t);
    const creation = runCli(directory, ["create", "police_job", "--framework", "esx"]);
    assert.equal(creation.status, 0, creation.stderr);
    const result = runCli(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "police_job\n");
});

test("ignore les liens symboliques", { skip: process.platform === "win32" }, (t) => {
    const directory = prepareDirectory(t);
    addResource(directory, "police_job");
    fs.symlinkSync(path.join(directory, "police_job"), path.join(directory, "alias"), "dir");
    fs.mkdirSync(path.join(directory, "linked_manifest"));
    fs.symlinkSync(
        path.join(directory, "police_job/fxmanifest.lua"),
        path.join(directory, "linked_manifest/fxmanifest.lua")
    );
    assert.deepEqual(listResources(directory), ["police_job"]);
});

for (const args of [["list", "extra"], ["list", "--framework", "esx"]]) {
    test(`refuse les arguments non pris en charge : ${args.join(" ")}`, (t) => {
        const directory = prepareDirectory(t);
        const result = runCli(directory, args);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.notEqual(result.stderr, "");
        assert.deepEqual(fs.readdirSync(directory), []);
    });
}

for (const operation of ["readdirSync", "lstatSync"]) {
    test(`signale les permissions insuffisantes pendant ${operation}`, (t) => {
        const directory = prepareDirectory(t);
        addResource(directory, "police_job");
        const failure = Object.assign(new Error("access denied"), { code: "EACCES" });
        t.mock.method(fs, operation, () => { throw failure; });
        assert.throws(() => listResources(directory), (error) => {
            assert.match(error.message, /Impossible de lister les ressources.*permissions insuffisantes/);
            assert.equal(error.cause, failure);
            return true;
        });
    });
}

test("signale un répertoire de recherche inexistant", (t) => {
    const directory = prepareDirectory(t);
    assert.throws(() => listResources(path.join(directory, "missing")), /Impossible de lister les ressources/);
});
