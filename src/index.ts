import { parseArgs } from "node:util";
import { createResource } from "./create-resource.js";
import { listResources } from "./list-resources.js";

const args = process.argv;

const command = args[2];

if (!command) {
    console.log("Commande non trouvée.");
} else if (command === "create") {

    try {
        const { values, positionals } = parseArgs({
            args: args.slice(3),
            options: {
                framework: { type: "string", default: "standalone" }
            },
            allowPositionals: true
        });
        const resourceName = positionals[0];

        if (!resourceName) {
            throw new Error("Nom de la ressource non trouvé.");
        }
        if (positionals.length > 1) {
            throw new Error("Une seule ressource peut être créée à la fois.");
        }

        createResource(resourceName, values.framework);
        console.log(`Ressource créée : ${resourceName} (${values.framework})`);
    } catch (error) {
        console.error(error instanceof Error ? error.message : "Impossible de créer la ressource.");
        process.exitCode = 1;
    }

} else if (command === "list") {

    try {
        parseArgs({ args: args.slice(3), allowPositionals: false });
        const resources = listResources();
        console.log(resources.length > 0 ? resources.join("\n") : "Aucune ressource trouvée.");
    } catch (error) {
        console.error(error instanceof Error ? error.message : "Impossible de lister les ressources.");
        process.exitCode = 1;
    }

} else {

    console.log(`Commande inconnue : ${command}`);
}
