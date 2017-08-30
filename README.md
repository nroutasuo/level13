# Level 13

Level 13 is an text-based incremental science fiction browser adventure where the player must survive in a dark, decayed City, (re)discover old and new technologies, and rebuild a civilization that has collapsed.

Currently in early development. See [changelog.json](https://github.com/nroutasuo/level13/blob/master/changelog.json) for version details.

Play lastest (semi-) stable version [here](https://nroutasuo.github.io/level13/).


## Features

* Randomly generated maps
* Survival and exploration
* Base-building and resource-management
* Items, equipment and environmental hazards
* Technologies that slowly unlock new aspects of the game

Main features still missing: story and role-playing elements, gods, the ending.


## Code Overview

The project uses [jQuery](https://jquery.com/), [Require.js](http://requirejs.org/), and [Ash.js]( https://github.com/brejep/ash-js) and is structured into entities, components and systems.

### Entities and Components

There are four types of entities: the player, the tribe, sectors and levels. The player entity has a position, items, stats and so on. The tribe entity stores general game status things like unlocked upgrades. Sectors and levels represent the structure and status of the game world. 

All actual game data is stored in various [Components](https://github.com/nroutasuo/level13/tree/master/src/game/components) of these entities and the game save simply consists of selected components.

### Player Actions 

Everything that the player can do in the game - mainly button clicks - are "player actions". Each action has a name, costs, requirements and so on defined in the [PlayerActionConstants](https://github.com/nroutasuo/level13/blob/master/src/game/constants/PlayerActionConstants.js). The [PlayerActionFunctions](https://github.com/nroutasuo/level13/blob/master/src/game/PlayerActionFunctions.js) class contains a function for each action and handles their results. Various helper classes take care of checking those requirements, deducting costs, unifying random encounters etc.  

User input is detected and mapped to PlayerActions by [UIFunctions](https://github.com/nroutasuo/level13/blob/master/src/game/UIFunctions.js).

### WorldCreator

At the start of a new game, a seed value is assigned. The world is randomly generated based on this seed and only the seed needs to be saved between sessions.

![samplelevel2](doc/samplelevel2)

(Sample level structure)

The [WorldCreator](https://github.com/nroutasuo/level13/blob/master/src/game/worldcreator/WorldCreator.js) generates from the seed value

* Basic structure of the world (ground level, surface level, sector locations and passages between levels)
* World texture (sector features like building density and environmental hazards)
* Resources (locations where the player can find supplies and workshops)
* Locales (special locations that can be scouted once for rewards such as blueprints)
* Enemies (locations and types of enemies that appear in some sectors)

The main constraints for the world creator to keep the game fair and balanced is that all sectors are accessible (there is enough water/food scattered across the level) and that enemy and environmental hazard difficulty increases proportionally to available equipment. 

The basic unit for balancing the world creator is the Level Ordinal. Level 13 where the player always starts is ordinal 1, Level 12 is 2, and so on all the way to the Ground Level. Level 14 is Ground Level + 1 and so on until Surface Level. For some values, Camp Ordinal is used instead.

### Game Systems

The game consists of several systems but here are some important ones:

* [GameManager](https://github.com/nroutasuo/level13/blob/master/src/game/systems/GameManager.js) starts and loads the game and creates entities.
* Various [UIOutSystems](https://github.com/nroutasuo/level13/tree/master/src/game/systems/ui) update the UI.
* [SaveSystem](https://github.com/nroutasuo/level13/blob/master/src/game/systems/SaveSystem.js) saves the game state periodically by simply saving certain components that have been marked with the SaveComponent.
* [PlayerPositionSystem](https://github.com/nroutasuo/level13/blob/master/src/game/systems/PlayerPositionSystem.js) keeps track of the current sector and level the player is in.


## Links

Level 13 is heavily inspired by [A Dark Room]( http://adarkroom.doublespeakgames.com/). Other great text-based and / or incremental games that the game owes much inspiration to include:

* [Kittens Game](http://bloodrizer.ru/games/kittens/)
* [Shark Game](http://cirri.al/sharks/)
* [Crank](https://faedine.com/games/crank/b39/)
* [Junction Gate](http://www.junctiongate.com/)
* [CivClicker](http://dhmholley.co.uk/civclicker.html)
* [Properity](http://playprosperity.ca/)

