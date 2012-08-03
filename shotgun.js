/*

Name: shotgun.js
Author: John Newman
Date: 1/21/2012
License: MIT
Version: 3.1
URL: github.com/jgnewman/shotgun
Description: Smarter than your average pubsub library.  Small and fast.  
Contains trappable internal events and gives you lots of control over your subscriptions.

As of v3.1:
    Support for internal events such that you won't risk overwriting internal event names when you create an event.

As of v3.0:
    Since it is least frequently used, key is now always the last argument.
    SG.try has been renamed SG.attempt for linting purposes.
    SG.attempt now passes the function you tried to call along with the error to the error listener.
    Smarter, faster, more organized directory structure.
    Better unique ID generator that doesn't have to check previously generated IDs.

As of v2.0:
    Completely revamped the events syntax to feel and work more like a directory system.
    You can now group events together under "directories".
    As such, you no longer pass in arrays of keys to publish because sub directories are a better way to group events.
    Changed syntax to generally help you get there faster.
    Using a '*' at the end of your event will fire all events and events under sub-directories under the current path.
    This is recursive though, so don't go crazy with your events if you're going to use it.
    SHOTGUN.events has been renamed SHOTGUN.getEvents.

As of v1.5:
    Contains an event-based abstraction of the try/catch block.  
    You can now decouple your error handling from your work flow, set multiple tries to a single catch,
    and even indirectly call your try recursively through an events channel.
    Unique keys are now shorter and SHOTGUN will run a test to make sure generated keys are actually unique.
    Contains a new trappable event: tryError

Internal events you can trap:
    newListener -> Fired any time a new subscription is made.  Gives you an object containing the event, key, and action.
    rmEvent     -> Fired any time you remove an entire group of actions by event name.  Gives you the name of the event removed.
    rmListener  -> Fired any time you unsubscribe a single action by key.  Gives you the name of the event and the name of the key.
    tryError    -> Fired any time SHOTGUN.try() publishes an error.

*/

(function (context) {
    'use strict';

    // This is to give you more options for naming your events.
    /*jslint nomen: true */

    var version       = '3.1',
        idIncrementor = 999999,
        realEvents    = {},
        eventDirs,
        internalEventDirs,
        sg;

    // Constructors for naming our event dir objects
    function Events() {}
    function InternalEvents() {}

    // Use the constructors to name our event dir objects
    eventDirs = new Events();
    internalEventDirs = new InternalEvents();

    // Function for looping over an array
    function map(arr, fn) {
        var i, l = arr.length;
        for (i = 0; i < l; i += 1) {
            fn(arr[i], i);
        }
    }

    // Function for looping over json
    function chart(obj, fn) {
        var i;
        for (i in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, i)) {
                fn(obj[i], i);
            }
        }
    }

    function lead(arr) {
        return arr.slice(0, arr.length - 1);
    }

    function last(arr) {
        return arr[arr.length - 1];
    }

    // Function for generating universally-unique, random strings
    function uid() {

        // Start with "SG-" for shotgun
        var newStr = "SG-", i, chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz";

        // Add a timestamp
        newStr += (new Date()).getTime();

        // Add 1 to the incrementor and add on the new number
        idIncrementor += 1;
        newStr += ("-" + idIncrementor + "-");

        // Reset the incrementor if it's getting too large
        if (idIncrementor === 9999999) {
            idIncrementor = 1000000;
        }

        // Add on a random 25 char string and end
        for (i = 0; i < 25; i += 1) {
            newStr += chars[Math.floor(Math.random() * chars.length)];
        }
        return newStr;
    }

    // Function for determining whether we're firing internal events nor non
    function evIsInternal(name) {
        return (name.slice(0, 9) === '_internal');
    }

    // Function for creating a directory object.
    function dirObject(name, parentDir, gotHereFromListen) {
        var eventRef;
        
        // Die if we're trying to create a directory under internalEventDirs
        // and we got here from Shotgun.listen
        if (parentDir === internalEventDirs && gotHereFromListen) {
            throw new Error('Attempt to subscribe to an internal event without first registering the event.');
        }

        // Create a new id and a spot in realEvents associated with it
        eventRef = uid();
        realEvents[eventRef] = {};

        // Set up a prototype with access to that spot in realEvents
        function Directory() {}
        Directory.prototype = {
            "_SG_dirEvents"    : realEvents[eventRef],
            "_SG_dirEventsKey" : eventRef,
            "_SG_parentDir"    : parentDir,
            "_SG_dirName"      : name
        };

        // Build the object with its prototype
        return new Directory();
    }

    function invokeEvents(evDir, key, args, beRecursive) {
        var events = evDir._SG_dirEvents;

        // If we have a key, only call the function associated with that key and end.
        if (key) {
            events[key].apply(null, args);
            return true;
        }

        // If we don't have a key, call all the functions in the evdir.
        chart(events, function (val) {
            val.apply(null, args);
        });

        // If we don't want to be recursive, stop here.
        if (!beRecursive) {
            return true;
        }

        // If we do want to be recursive, call self for every directory in the evdir.
        return chart(evDir, function (val) {
            return invokeEvents(val, key, args, beRecursive);
        });

    }

    sg = {

        "fire" : function (ev, args, key) {
            var eventArray,
                argArray,
                realKey,
                recursive,
                evDir;

            // Allow user to be somewhat liberal with arguments
            if (typeof args === 'string') {
                argArray = [];
                realKey = args;
            } else {
                argArray = args;
                realKey = key;
            }

            // Determine whether this is an internal event or not and set evDir appropriately
            if (evIsInternal(ev)) {
                // Slice the keyword off the front of the event name
                ev = ev.slice(10);
                evDir = internalEventDirs;
            } else {
                evDir = eventDirs;
            }

            // Determine whether or not we need to be recursive and set up our directory chain array
            if (last(ev) === '*') {
                recursive = true;
                eventArray = lead(lead(ev)).split('/');
            } else {
                eventArray = ev.split('/');
            }

            // Use that chain array to find our event directory
            map(eventArray, function (each) {
                evDir = evDir[each];
            });

            // Give up if the event doesn't exist
            if (!evDir) {
                return false;
            }

            // Fire off desired functions listening for this event
            return invokeEvents(evDir, realKey, argArray, recursive);

        },

        "listen" : function (ev, fn, key) {
            var realKey = key || uid(),
                evArray,
                parentDir;

            // Determine whether this is an internal event or not and set parentDir appropriately
            if (evIsInternal(ev)) {
                // Slice the keyword off the front of the event name
                ev = ev.slice(10);
                parentDir = internalEventDirs;
            } else {
                parentDir = eventDirs;
            }

            // Creat our directory chain array
            evArray = ev.split('/');

            // create directories as needed
            map(evArray, function (each) {
                parentDir[each] = parentDir[each] || dirObject(each, parentDir, true);
                parentDir = parentDir[each];
            });

            // put the function into the realEvents directory
            parentDir._SG_dirEvents[realKey] = fn;

            // fire an internal event
            this.fire('_internal/newListener', [ev, fn, realKey]);

            return realKey;
        },

        "registerInternal" : function () { /* list as many event names as you want as arguments */
            map(arguments, function (arg) {
                var evDir = internalEventDirs,
                    evArray = arg.split('/');

                // create directories as needed
                map(evArray, function (each) {
                    evDir[each] = evDir[each] || dirObject(each, evDir, false);
                    evDir = evDir[each];
                });
            });

            return true;
        },

        "remove" : function (ev, key) {
            var eventArray,
                evDir;

            // Determine whether this is an internal event or not and set evDir appropriately
            if (evIsInternal(ev)) {
                // Slice the keyword off the front of the event name
                ev = ev.slice(10);
                evDir = internalEventDirs;
            } else {
                evDir = eventDirs;
            }

            // Set up our directory chain array
            eventArray = ev.split('/');

            // Find our event directory
            map(eventArray, function (each) {
                evDir = evDir[each];
            });

            // If we have a key, remove that function and end
            if (key) {
                delete evDir._SG_dirEvents[key];
                this.fire('_internal/rmListener', [ev, key]);
                return true;
            }

            // If we don't have a key, remove the entire event and end
            delete realEvents[evDir._SG_dirEventsKey];
            delete evDir._SG_parentDir[evDir._SG_dirName];
            this.fire('_internal/rmEvent', [ev]);
            return true;

        },

        "attempt" : function (ev, fn, key) {
            var realEvent,
                realFn,
                realKey;

            // Allow user to be somewhat liberal with arguments.
            // You don't have to pass in an event name if you don't want to.
            if (typeof ev === 'function') {
                realFn = ev;
                realKey = fn;
            } else {
                realEvent = ev;
                realFn = fn;
                realKey = key;
            }

            // Try to call the function
            try {
                realFn();

            // If it doesn't work...
            } catch (err) {

                // Fire the user's manual event if there is one
                if (realEvent) {
                    this.fire(realEvent, [err, realFn], realKey);
                }

                // Fire the internal tryError event
                this.fire('_internal/tryError', [err, realFn], realKey);

            }
        },

        "getEvents" : function () {
            return eventDirs;
        },

        "getInternalEvents" : function () {
            return internalEventDirs;
        },

        "version" : version
    };

    // Register default internal events
    sg.registerInternal('newListener', 'rmEvent', 'rmListener', 'tryError');

    // Export to multiple environments

    // AMD
    if (context.define && typeof context.define === 'function' && context.define.amd) {
        context.define('SHOTGUN', [], sg);
        context.define('SG', [], sg);

    // Weird stuff
    } else if (context.module && context.module.exports) {
        context.module.exports = sg;

    // Browser & node
    } else {
        context.SHOTGUN = context.SG = sg;
    }

}(this));
