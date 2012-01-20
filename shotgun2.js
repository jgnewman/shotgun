/*

Name: shotgun.js
Author: John Newman
Date: 12/22/2011
License: MIT
Version: 2.0
Description: Smarter than your average pubsub library.  Small and fast.  
Contains trappable internal events and gives you lots of control over your subscriptions.

As of v2.0:
    Completely revamped the events syntax to feel and work more like a directory system.
    You can now group events together under "directories".
    Changed syntax to generally help you get there faster.

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
    "use strict";

    var eventsObj = {}, keysUsed = {}, version = '2.0', sg;

    function map(arr, fn) {
        var i, l = arr.length;
        for (i = 0; i < l; i += 1) {
            fn(arr[i], i);
        }
    }

    function rest(arr) {
        return arr.slice(1);
    }

    function last(arr) {
        return arr[arr.length-1];
    }

    // Function for generating random strings
    function genUnique() {
        var i, newStr = '', chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz';
        for (i = 0; i < 24; i += 1) {
            newStr += chars[Math.floor(Math.random() * chars.length)];
        }
        if (!keysUsed[newStr] || newStr.slice(0, 7) !== '_evdir_') {
            keysUsed[newStr] = true;
            return newStr;
        } else {
            return genUnique();
        }
    }

    function publish(ev, key, args) {
        
    }

    function subscribe(ev, key, fn) {
        // !! Note: make it so events are somehow distinguishable from keys in a given directory
        var keyfix, parts = ev.split('/'), paths = [], finalPath, finalPart;
        if (!fn && typeof key === 'function') {
            fn = key;
            keyfix = genUnique();
        } else {
            keyfix = key;
        }
        if (parts.length > 1) {
            // make sure an object exists for the event and every sub event underneath it
            map(rest(parts), function (e, i) {
                var lastPath = last(paths) || eventsObj;
                lastPath[parts[i]] = lastPath[parts[i]] || {};
                paths.push(lastPath[parts[i]]);
            });
            finalPath = last(paths);
            finalPart = last(parts);
            finalPath[finalPart] = finalPath[finalPart] || {};
            // subscribe the function to the event
            finalPath[finalPart][keyfix] = fn;
        } else {
            finalPart = parts[0];
            eventsObj[finalPart] = eventsObj[finalPart] || {};
            // subscribe the function to the event
            eventsObj[finalPart][keyfix] = fn;
        }
        // !! publish the new susbscription event here
        return keyfix;
    }

    function getEvents() {
        return eventsObj;
    }

}(this));