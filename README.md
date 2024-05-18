# Level 13

Level 13 is an text-based incremental science fiction browser adventure where the player must survive in a dark, decayed City, (re-)discover old and new technologies, and rebuild a civilization that has collapsed.

The game is in active development. It is a personal side project but has also received some fixes from the community along the way. Bug reports and feedback are very welcome, but please check the [contributing guidelines](docs/CONTRIBUTING.md) first.

## Quick Links
* Play the game [here](https://nroutasuo.github.io/level13/)
* Read about how to report bugs, suggest features, or submit fixes to the project in the [contributing guidelines](docs/CONTRIBUTING.md)
* Chat about the game or get help on the [discussions page](https://github.com/nroutasuo/level13/discussions), the [subreddit](https://www.reddit.com/r/level13/), or the [Discord server](https://discord.gg/BzMbATyKph)

## Game Overview

### Features

* Survival and exploration
* Base-building and resource-management
* Randomly generated maps
* Items, equipment and environmental hazards
* Technologies that slowly unlock new aspects of the game

## Code Overview

The project uses [jQuery](https://jquery.com/), [Require.js](http://requirejs.org/), and [Ash.js](https://github.com/brejep/ash-js) and is structured according to an entity system framework into entities, components and systems.

### Branches
* **master** is a development branch and can contain unfinished and buggy features
* **gh-pages** is more stable and contains whatever is currently live

### Entities and Components

All game data is stored in various [Components](https://github.com/nroutasuo/level13/tree/master/src/game/components) that are attached to entities such as the player or a sector. Entities are simply containers for Components. The [EntityCreator](https://github.com/nroutasuo/level13/blob/master/src/game/EntityCreator.js) gives a good overview of what kind of entities have what kind of components.

### Systems

Various independent [Systems](https://github.com/nroutasuo/level13/tree/master/src/game/systems) use and change data on Components and make stuff happen in the game. They generate resources, update movement options, resolve fights and so on. Each area of the UI is taken care of by its own [UI system](https://github.com/nroutasuo/level13/tree/master/src/game/systems/ui).

### Player Actions

Everything that the player can do in the game - mainly button clicks - are called "player actions". Each action has an associated name, costs, requirements, cooldown and so on. The [PlayerActionFunctions](https://github.com/nroutasuo/level13/blob/master/src/game/PlayerActionFunctions.js) class contains a function for each action and handles their results. Various helpers take care of checking requirements, deducting costs, unifying random encounters and so on.

### World Creator

At the start of a new game, a seed value is assigned to the game. The [World Creator](https://github.com/nroutasuo/level13/tree/master/src/worldcreator) generates a unique world based on this seed and only the seed needs to be saved between sessions.

![samplelevel2](/docs/samplelevel2.PNG)  ![samplelevel3](/docs/samplelevel3.PNG)

(Sample level structure)

The world is generated in roughly the following steps:
* [WorldGenerator](https://github.com/nroutasuo/level13/blob/master/src/worldcreator/WorldGenerator.js) determines rough structure of the entire world and important points like camp and passage locations
* [LevelGenerator](https://github.com/nroutasuo/level13/blob/master/src/worldcreator/LevelGenerator.js) adds more details to each level
* [StructureGenerator](https://github.com/nroutasuo/level13/blob/master/src/worldcreator/StructureGenerator.js) determines the structure of each level, placing sectors and paths according to constraints set in the previous steps
* [SectorGenerator](https://github.com/nroutasuo/level13/blob/master/src/worldcreator/SectorGenerator.js) populates the sectors with features like resources, item stashes, environmental hazards, movement blockers etc

Two important units for balancing the world are the camp ordinal and the level ordinal. Level 13 where the player always starts has level ordinal 1 and camp ordinal 1.

## Other games

Level 13 is heavily inspired by [A Dark Room]( http://adarkroom.doublespeakgames.com/). Other great text-based and / or incremental games that the game owes much inspiration to include:

* [Kittens Game](http://bloodrizer.ru/games/kittens/)
* [Shark Game](http://cirri.al/sharks/)
* [Crank](https://faedine.com/games/crank/b39/)
* [CivClicker](http://civclicker.sourceforge.net/civclicker/civclicker.html)
* [Prosperity](https://home.prosperity-game.com/)
