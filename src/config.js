// Set the require.js configuration for your application.
require.config({

    // Initialize the application with the main application file
    deps: ["level13-app"],

    paths: {
        // JavaScript folders
        brejep: "../lib/brejep",
        utils: "../lib/utils",
        game: "game",

        // Libraries
        ash: "../lib/ash/ash.min",
        jquery: "../lib/jquery/"
    },
    
});
