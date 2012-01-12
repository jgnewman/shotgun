/*

Name: shotgun.js
Author: John Newman
Date: 12/22/2011
License: MIT
Version: 1.5
Description: Smarter than your average pubsub library.  Small and fast.  
Contains trappable internal events and gives you lots of control over your subscriptions.

As of v1.5:
    Contains an event-based abstraction of the try/catch block.  You can now
    decouple your error handling from your work flow, set multiple tries to a single catch,
    and even indirectly call your try recursively through an events channel.

    Unique keys are now shorter and SHOTGUN will run a test to make sure generated keys are actually unique.

    Contains a new trappable event: tryError

Internal events you can trap:
    newListener -> Fired any time a new subscription is made.  Gives you an object containing the event, key, and action.
    rmEvent     -> Fired any time you remove an entire group of actions by event name.  Gives you the name of the event removed.
    rmListener  -> Fired any time you unsubscribe a single action by key.  Gives you the name of the event and the name of the key.
    tryError    -> Fired any time SHOTGUN.try() publishes an error.

*/

// ! We're almost there.  Figure out a way to put catches underneath tries?


(function (context) {
    "use strict";

    var eventsObj = {}, keysUsed = {}, version = '1.5', sg;

    // Function for generating random strings
    function genUnique() {
        var i, newStr = '', chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz';
        for (i = 0; i < 24; i += 1) {
            newStr += chars[Math.floor(Math.random() * chars.length)];
        }
        if (!keysUsed[newStr]) {
            keysUsed[newStr] = true;
            return newStr;
        } else {
            return genUnique();
        }
    }

    // General publish function {event, key, args}
    function publish(obj) {
        var i, key, keylen, action, name = eventsObj[obj.event];

        // If the event exists and we are passed a key...
        if (name && name[obj.key]) {

            if (typeof obj.key === 'string') {
                obj.key = [obj.key];
            }

            keylen = obj.key.length;

            for (i = 0; i < keylen; i += 1) {

                key = name[obj.key[i]];
                action = key.action;
                // If there is a function associated with that key...
                if (action) {
                    // Run the function.
                    action.apply(null, obj.args);
                }

            }

        // If the event exists and we are not passed a key...
        } else if (name && !name[obj.key]) {
            // Loop through all the keys associated with the event.  For each one...
            for (i in name) {
                if (Object.prototype.hasOwnProperty.call(name, i)) {
                    // We call the function.
                    name[i].action.apply(null, obj.args);
                }
            }
        }
    }

    // General subscription function {event, key, action}
    function subscribe(obj) {
        var key = obj.key || genUnique();
        eventsObj[obj.event] = eventsObj[obj.event] || {};
        eventsObj[obj.event][key] = {"action" : obj.action};
        publish({"event" : "newListener", "args" : [obj]});
        return key;
    }

    // General unsubscribe function {event, key}
    function unsubscribe(obj) {
        var i;
        if (!obj.key) {
            if (eventsObj[obj.event]) {
                // Free up all previously used keys in the event
                for (i in eventsObj[obj.event]) {
                    if (Object.prototype.hasOwnProperty.call(eventsObj[obj.event], i)) {
                        delete keysUsed[i];
                    }
                }
                // Delete the event
                delete eventsObj[obj.event];
                publish({"event" : "rmEvent", "args" : [obj.event]});
                return true;
            } else {
                return false;
            }
        }
        if (eventsObj[obj.event][obj.key]) {
            // Delete the event
            delete eventsObj[obj.event][obj.key];
            // Free up the used key
            delete keysUsed[obj.key];
            publish({"event" : "rmListener", "args" : [obj.event, obj.key]});
            return true;
        } else {
            return false;
        }
    }

    // Try/catch abstraction function {event, key, action}
    function attempt(obj) {
        var key = obj.key || null;
        try {
            obj.action();
        } catch (err) {
            publish({"event" : obj.event, "key" : key, "args" : [err]});
            if (obj.event !== 'tryError') {
                publish({"event" : "tryError", "key" : key, "args" : [err]});
            }
        }
    }

    sg = {

        "fire" : function (obj) {
            return publish(obj);
        },

        "listen" : function (obj) {
            return subscribe(obj);
        },

        "remove" : function (obj) {
            return unsubscribe(obj);
        },

        "events" : function () {
            return eventsObj;
        },

        "try" : function (obj) {
            return attempt(obj);
        },

        "version" : version

    };

    // exports to multiple environments

    // AMD
    if (context.define && typeof context.define === 'function' && context.define.amd) {
        context.define('SHOTGUN', [], sg);
    //node
    } else if (context.module && context.module.exports) {
        context.module.exports = sg;
    // browser
    } else {
        // use string because of Google closure compiler ADVANCED_MODE
        context['SHOTGUN'] = context['SG'] = sg;
    }

}(this));
