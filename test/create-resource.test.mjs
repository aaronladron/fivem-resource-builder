import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url));
const loader = import.meta.resolve("tsx");

function runCli(t, args) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fivem-resource-builder-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const directory = path.join(root, "workspace");
    fs.mkdirSync(directory);
    const result = spawnSync(process.execPath, ["--import", loader, cli, ...args], {
        cwd: directory,
        encoding: "utf8"
    });
    assert.ifError(result.error);
    return { root, directory, ...result };
}

const cases = [
    { name: "standalone", dependency: null, script: "" },
    { name: "esx", dependency: "es_extended", script: "" },
    {
        name: "qbcore",
        dependency: "qb-core",
        script: "local QBCore = exports['qb-core']:GetCoreObject()\n"
    },
    { name: "qbox", dependency: "qbx_core", script: "" }
];

for (const { name, dependency, script } of cases) {
    test(`crée une ressource ${name}`, (t) => {
        const result = runCli(t, ["create", "police_job", "--framework", name]);
        assert.equal(result.status, 0, result.stderr);
        const resource = path.join(result.directory, "police_job");
        assert.deepEqual(fs.readdirSync(resource).sort(), ["client", "fxmanifest.lua", "server", "shared"]);
        const manifest = fs.readFileSync(path.join(resource, "fxmanifest.lua"), "utf8");
        assert.match(manifest, /^fx_version 'cerulean'\ngame 'gta5'\n/);
        assert.match(manifest, /client_script 'client\/main.lua'/);
        assert.match(manifest, /server_script 'server\/main.lua'/);
        assert.deepEqual(
            [...manifest.matchAll(/^dependency '([^']+)'$/gm)].map((match) => match[1]),
            dependency ? [dependency] : []
        );
        if (name === "esx") {
            const importIndex = manifest.indexOf("shared_script '@es_extended/imports.lua'");
            assert.ok(importIndex >= 0);
            assert.ok(importIndex < manifest.indexOf("client_script 'client/main.lua'"));
        } else {
            assert.doesNotMatch(manifest, /@es_extended/);
        }
        for (const side of ["client", "server"]) {
            assert.equal(fs.readFileSync(path.join(resource, side, "main.lua"), "utf8"), script);
        }
        assert.deepEqual(fs.readdirSync(path.join(resource, "shared")), []);
    });
}

test("utilise standalone par défaut", (t) => {
    const result = runCli(t, ["create", "police_job"]);
    assert.equal(result.status, 0, result.stderr);
    const manifest = fs.readFileSync(path.join(result.directory, "police_job/fxmanifest.lua"), "utf8");
    assert.doesNotMatch(manifest, /dependency|shared_script/);
    assert.match(result.stdout, /standalone/);
});

for (const args of [
    ["create", "police_job", "--framework", "unknown"],
    ["create", "police_job", "--framework", "toString"],
    ["create", "police_job", "--framework", "__proto__"],
    ["create", "police_job", "--framework", ""],
    ["create", "police_job", "--framework"],
    ["create", "police_job", "--framwork", "esx"],
    ["create", "--framework", "esx"],
    ["create", "police_job", "extra"]
]) {
    test(`refuse les arguments invalides : ${JSON.stringify(args)}`, (t) => {
        const result = runCli(t, args);
        assert.equal(result.status, 1);
        assert.notEqual(result.stderr.trim(), "");
        assert.equal(result.stdout, "");
        assert.deepEqual(fs.readdirSync(result.directory), []);
    });
}

test("accepte le framework avant le nom et la syntaxe avec égal", (t) => {
    const result = runCli(t, ["create", "--framework=qbox", "police_job"]);
    assert.equal(result.status, 0, result.stderr);
    const manifest = fs.readFileSync(path.join(result.directory, "police_job/fxmanifest.lua"), "utf8");
    assert.match(manifest, /dependency 'qbx_core'/);
});

test("conserve une ressource existante lors d'une seconde création", (t) => {
    const first = runCli(t, ["create", "police_job", "--framework", "esx"]);
    assert.equal(first.status, 0, first.stderr);
    const manifestPath = path.join(first.directory, "police_job/fxmanifest.lua");
    const manifest = fs.readFileSync(manifestPath, "utf8");
    const second = spawnSync(process.execPath, [
        "--import", loader, cli, "create", "police_job", "--framework", "qbcore"
    ], { cwd: first.directory, encoding: "utf8" });
    assert.equal(second.status, 1);
    assert.equal(second.stdout, "");
    assert.equal(fs.readFileSync(manifestPath, "utf8"), manifest);
    assert.equal(fs.readFileSync(path.join(first.directory, "police_job/client/main.lua"), "utf8"), "");
});

for (const name of ["Police_Job-01", "123", "a"]) {
    test(`accepte le nom ${name} sans le modifier`, (t) => {
        const result = runCli(t, ["create", name]);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(fs.readdirSync(result.directory), [name]);
        assert.ok(fs.statSync(path.join(result.directory, name, "fxmanifest.lua")).isFile());
    });
}

for (const name of [
    "",
    " ",
    "police job",
    "police_job ",
    "policé",
    ".",
    "..",
    "../escaped_resource",
    "nested/police_job",
    "nested\\police_job",
    "/",
    "C:\\police_job",
    "[police_job]",
    "police.job",
    "police_job\n",
    "police_job\r",
    "police\tjob"
]) {
    test(`refuse le nom ${JSON.stringify(name)} avant toute écriture`, (t) => {
        const result = runCli(t, ["create", name]);
        assert.equal(result.status, 1);
        assert.match(result.stderr, name === "" ? /Nom de la ressource non trouvé/ : /Nom de ressource invalide/);
        assert.equal(result.stdout, "");
        assert.deepEqual(fs.readdirSync(result.directory), []);
        assert.deepEqual(fs.readdirSync(result.root), ["workspace"]);
    });
}
