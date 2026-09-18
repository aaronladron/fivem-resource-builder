export interface FrameworkTemplate {
    manifest: string;
    client: string;
    server: string;
}

const frameworks: Record<string, FrameworkTemplate> = {
    standalone: {
        manifest: "",
        client: "",
        server: ""
    },
    esx: {
        manifest: "dependency 'es_extended'\nshared_script '@es_extended/imports.lua'\n",
        client: "",
        server: ""
    },
    qbcore: {
        manifest: "dependency 'qb-core'\n",
        client: "local QBCore = exports['qb-core']:GetCoreObject()\n",
        server: "local QBCore = exports['qb-core']:GetCoreObject()\n"
    },
    qbox: {
        manifest: "dependency 'qbx_core'\n",
        client: "",
        server: ""
    }
};

export function getFrameworkTemplate(name: string): FrameworkTemplate {
    const template = Object.hasOwn(frameworks, name) ? frameworks[name] : undefined;

    if (!template) {
        throw new Error(
            `Framework inconnu : ${name}. Choix disponibles : ${Object.keys(frameworks).join(", ")}.`
        );
    }

    return template;
}
