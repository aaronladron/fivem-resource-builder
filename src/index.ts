import fs from "node:fs";

const args = process.argv;

const command = args[2];
const resourceName = args[3];

if (!command) {
    console.log("Commande non trouvée.");
} else if (command === "create") {

    if (!resourceName) {
        console.log("Nom de la ressource non trouvé.");
    } else {
        console.log(`Création de la ressource : ${resourceName}`);
        fs.mkdirSync(`./${resourceName}`);
        fs.writeFileSync(`./${resourceName}/fxmanifest.lua`, "");
    }

} else if (command === "list") {

    console.log("Liste des ressources.");

} else {

    console.log(`Commande inconnue : ${command}`);
}
