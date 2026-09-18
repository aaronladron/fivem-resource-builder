import fs from "node:fs";
import path from "node:path";
import { getFrameworkTemplate } from "./frameworks.js";

export function createResource(resourceName: string, framework: string): void {
    const template = getFrameworkTemplate(framework);
    const manifest = "fx_version 'cerulean'\ngame 'gta5'\n\n"
        + template.manifest
        + "client_script 'client/main.lua'\nserver_script 'server/main.lua'\n";

    fs.mkdirSync(resourceName);
    fs.writeFileSync(path.join(resourceName, "fxmanifest.lua"), manifest, "utf8");
    fs.mkdirSync(path.join(resourceName, "client"));
    fs.mkdirSync(path.join(resourceName, "server"));
    fs.mkdirSync(path.join(resourceName, "shared"));
    fs.writeFileSync(path.join(resourceName, "client/main.lua"), template.client, "utf8");
    fs.writeFileSync(path.join(resourceName, "server/main.lua"), template.server, "utf8");
}
