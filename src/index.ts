import { parseArgs } from "node:util";
import { createResource } from "./create-resource.js";

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

    console.log("Liste des ressources.");

} else {

    console.log(`Commande inconnue : ${command}`);
}
