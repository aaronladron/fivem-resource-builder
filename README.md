# FiveM Resource Builder

CLI TypeScript pour créer une base de ressource FiveM en Lua.

## Utilisation

```bash
npm install
npx tsx src/index.ts create police_job --framework esx
```

Le dossier est créé dans le répertoire courant. Sans `--framework`, le CLI utilise `standalone`.

| Option | Génération |
| --- | --- |
| `standalone` | Aucune dépendance à un framework. |
| `esx` | Dépendance `es_extended` et import partagé `@es_extended/imports.lua` pour ESX Legacy. |
| `qbcore` | Dépendance `qb-core` et initialisation locale de `QBCore` dans les scripts client et serveur. |
| `qbox` | Dépendance `qbx_core`. Les exports natifs de Qbox peuvent être utilisés directement dans les scripts. |

Ces quatre modes sont les seuls pris en charge pour le moment. Les frameworks doivent déjà être installés sur le serveur FiveM ; le CLI ne les installe pas.

```text
police_job/
├── fxmanifest.lua
├── client/
│   └── main.lua
├── server/
│   └── main.lua
└── shared/
```

Le manifeste déclare les deux fichiers `main.lua`. Ils sont vides sauf pour l'initialisation de QBCore. Le dossier `shared` est disponible pour les futurs scripts, qui devront être déclarés dans le manifeste.

Un framework inconnu ou une option invalide arrête la commande avant toute création. Un dossier existant n'est pas écrasé.

## Développement

Les templates sont définis dans `src/frameworks.ts` et la création des fichiers dans `src/create-resource.ts`.

```bash
npm test
npx tsc --noEmit
```

Les tests exécutent le CLI dans des dossiers temporaires et vérifient les fichiers générés. Ils ne démarrent pas de serveur FiveM.

## Références des frameworks

- [Import ESX Legacy](https://github.com/esx-framework/esx_core/blob/main/%5Bcore%5D/es_extended/imports.lua)
- [Objet QBCore](https://qbcore.org/docs/qb-core/core-object)
- [API native et compatibilité Qbox](https://docs.qbox.re/faq)
