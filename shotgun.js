/*

Name: shotgun.js
Author: John Newman
Date: 12/22/2011
License: MIT
Description: Smarter than your average pubsub library.  Small and fast.  
Contains trappable internal events and gives you lots of control over your subscriptions.

Internal events you can trap:
    newListener -> Fired any time a new subscription is made.  Gives you an object containing the event, key, and action.
    rmEvent     -> Fired any time you remove an entire group of actions by event name.  Gives you the name of the event removed.
    rmListener  -> Fired any time you unsubscribe a single action by key.  Gives you the name of the event and the name of the key.

*/


(function (context) {
    "use strict";

    var eventsObj = {}, version = '1.0';

    // Function for generating random strings
    function genUnique() {
        var i, newStr = '', chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz_`~!?.,<>@#$%^*()[]{}|+=-/&:;';
        for (i = 0; i < 64; i += 1) {
            newStr += chars[Math.floor(Math.random() * chars.length)];
        }
        return newStr;
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
        if (!obj.key) {
            if (eventsObj[obj.event]) {
                delete eventsObj[obj.event];
                publish({"event" : "rmEvent", "args" : [obj.event]});
                return true;
            } else {
                return false;
            }
        }
        if (eventsObj[obj.event][obj.key]) {
            delete eventsObj[obj.event][obj.key];
            publish({"event" : "rmListener", "args" : [obj.event, obj.key]});
            return true;
        } else {
            return false;
        }
    }

    context.SG = context.SHOTGUN = context.SHOTGUN || {

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

        "version" : version

    };

}(this));
