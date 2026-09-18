import fs from "node:fs";
import path from "node:path";

export function listResources(directory = "."): string[] {
    try {
        return fs.readdirSync(directory, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .filter((entry) => fs.lstatSync(
                path.join(directory, entry.name, "fxmanifest.lua"),
                { throwIfNoEntry: false }
            )?.isFile())
            .map((entry) => entry.name)
            .sort();
    } catch (error) {
        const code = error instanceof Error && "code" in error ? error.code : undefined;
        const detail = code === "EACCES" || code === "EPERM"
            ? "permissions insuffisantes pour lire les dossiers"
            : error instanceof Error ? error.message : "erreur inconnue";

        throw new Error(`Impossible de lister les ressources : ${detail}.`, { cause: error });
    }
}
