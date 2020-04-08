# Level 13

Level 13 is an text-based incremental science fiction browser adventure where the player must survive in a dark, decayed City, (re-)discover old and new technologies, and rebuild a civilization that has collapsed.

The game is in early development. You can play latest (semi-) stable version [here](https://nroutasuo.github.io/level13/).

Level 13 is a personal side project but has received some fixes from the community along the way. If you are interested in contributing, check the [contributing guidelines](docs/CONTRIBUTING.md) first.


## Features

* Survival and exploration
* Base-building and resource-management
* Randomly generated maps
* Items, equipment and environmental hazards
* Technologies that slowly unlock new aspects of the game

Major planned features still missing: story and role-playing elements, gods, magic.

## Code Overview

The project uses [jQuery](https://jquery.com/), [Require.js](http://requirejs.org/), and [Ash.js](https://github.com/brejep/ash-js) and is structured into entities, components and systems.

### Entities and Components

There are four types of entities: the player, the tribe, sectors and levels. The player entity has a position, items, stats and so on. The tribe entity stores general game status such as unlocked upgrades. Sectors and levels represent the structure and status of the game world.

All actual game data is stored in various [Components](https://github.com/nroutasuo/level13/tree/master/src/game/components) of these entities and the game save simply consists of selected components.

### Player Actions

Everything that the player can do in the game - mainly button clicks - are "player actions". Each action has a name, costs, requirements and so on defined in the [PlayerActionConstants](https://github.com/nroutasuo/level13/blob/master/src/game/constants/PlayerActionConstants.js). The [PlayerActionFunctions](https://github.com/nroutasuo/level13/blob/master/src/game/PlayerActionFunctions.js) class contains a function for each action and handles their results. Various helper classes take care of checking those requirements, deducting costs, unifying random encounters etc.

### WorldCreator

At the start of a new game, a seed value is assigned. The world is generated based on this seed and only the seed needs to be saved between sessions.

![samplelevel2](/docs/samplelevel2.PNG)  ![samplelevel3](/docs/samplelevel3.PNG)

(Sample level structure)

The [WorldCreator](https://github.com/nroutasuo/level13/blob/master/src/worldcreator/WorldCreator.js) generates from the seed value

* Basic structure of the world (ground level, surface level, sector locations and passages between levels)
* World texture (sector features like building density and environmental hazards)
* Locales (special locations that the player can visit once)
* Resources (locations where the player can find supplies and workshops)
* Enemies (locations and types of enemies that appear in some sectors)

Two basic units for balancing the WorldCreator are the camp ordinal and the level ordinal. Level 13 where the player always starts has level ordinal 1 and camp ordinal 1.

## Contributing

If you want to report bugs or suggest new features please read the [contributing guidelines](docs/CONTRIBUTING.md) first.

## Links

Level 13 is heavily inspired by [A Dark Room]( http://adarkroom.doublespeakgames.com/). Other great text-based and / or incremental games that the game owes much inspiration to include:

* [Kittens Game](http://bloodrizer.ru/games/kittens/)
* [Shark Game](http://cirri.al/sharks/)
* [Crank](https://faedine.com/games/crank/b39/)
* [Junction Gate](http://www.junctiongate.com/)
* [CivClicker](http://dhmholley.co.uk/civclicker.html)
* [Properity](http://playprosperity.ca/)
