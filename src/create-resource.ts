import fs from "node:fs";
import path from "node:path";
import { getFrameworkTemplate } from "./frameworks.js";

function describeCreationError(error: unknown, resourceName: string): string {
    const code = error instanceof Error && "code" in error ? error.code : undefined;

    switch (code) {
        case "EEXIST":
            return `Le chemin « ${resourceName} » existe déjà. Choisissez un autre nom.`;
        case "EACCES":
        case "EPERM":
            return `Permissions insuffisantes pour créer la ressource « ${resourceName} ». Vérifiez les droits du dossier courant.`;
        case "ENOSPC":
            return `Espace disque insuffisant pour créer la ressource « ${resourceName} ».`;
        default:
            return `Impossible de créer la ressource « ${resourceName} » : ${error instanceof Error ? error.message : "erreur inconnue"}.`;
    }
}

export function createResource(resourceName: string, framework: string): void {
    if (!resourceName || /[^a-zA-Z0-9_-]/.test(resourceName)) {
        throw new Error(
            "Nom de ressource invalide : utilisez uniquement des lettres non accentuées, des chiffres, des tirets (-) et des underscores (_)."
        );
    }

    const template = getFrameworkTemplate(framework);
    const manifest = "fx_version 'cerulean'\ngame 'gta5'\n\n"
        + template.manifest
        + "client_script 'client/main.lua'\nserver_script 'server/main.lua'\n";

    let resourceCreated = false;

    try {
        fs.mkdirSync(resourceName);
        resourceCreated = true;
        fs.writeFileSync(path.join(resourceName, "fxmanifest.lua"), manifest, "utf8");
        fs.mkdirSync(path.join(resourceName, "client"));
        fs.mkdirSync(path.join(resourceName, "server"));
        fs.mkdirSync(path.join(resourceName, "shared"));
        fs.writeFileSync(path.join(resourceName, "client/main.lua"), template.client, "utf8");
        fs.writeFileSync(path.join(resourceName, "server/main.lua"), template.server, "utf8");
    } catch (error) {
        const message = describeCreationError(error, resourceName);

        if (resourceCreated) {
            try {
                fs.rmSync(resourceName, { recursive: true, force: true });
            } catch (cleanupError) {
                throw new Error(
                    `${message} Le nettoyage a échoué : vérifiez le dossier incomplet « ${resourceName} » avant de réessayer.`,
                    { cause: new AggregateError([error, cleanupError]) }
                );
            }
        }

        throw new Error(message, { cause: error });
    }
}
