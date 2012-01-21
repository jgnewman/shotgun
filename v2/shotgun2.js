/*

Name: shotgun.js
Author: John Newman
Date: 1/21/2012
License: MIT
Version: 2.0
Description: Smarter than your average pubsub library.  Small and fast.  
Contains trappable internal events and gives you lots of control over your subscriptions.

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
    "use strict";

    var eventsObj, keysUsed = {}, version = '2.0', sg;

    function EvDir(name) {
        this['_::name'] = name;
    }
    eventsObj = new EvDir('eventsObj');

    function map(arr, fn) {
        var i, l = arr.length;
        for (i = 0; i < l; i += 1) {
            fn(arr[i], i);
        }
    }

    function chart(obj, fn) {
        var i;
        for (i in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, i)) {
                fn(obj[i], i);
            }
        }
    }

    function rest(arr) {
        return arr.slice(1);
    }

    function lead(arr) {
        return arr.slice(0, arr.length - 1);
    }

    function last(arr) {
        return arr[arr.length - 1];
    }

    function formatEvent(str) {
        if (str[0] === '/') {
            str = rest(str);
        }
        if (last(str) === '/') {
            str = lead(str);
        }
        return str;
    }

    // Function for generating random strings
    function genUnique() {
        var i, newStr = '', chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz';
        for (i = 0; i < 24; i += 1) {
            newStr += chars[Math.floor(Math.random() * chars.length)];
        }
        // _: is the secret identifier for directories
        if (!keysUsed[newStr] || newStr.slice(0, 2) !== '_:') {
            keysUsed[newStr] = true;
            return newStr;
        } else {
            return genUnique();
        }
    }

    sg = {
        "fire" : function (ev, key, args) {
            var paths = [], that = this, keyfix, parts, endObj, rec;
            ev = formatEvent(ev);
            parts = ev.split('/');
            if (!args && Object.prototype.toString.call(key) === '[object Array]') {
                args = key;
            } else {
                keyfix = key;
            }
            // Override key if the user wants to fire all events and sub events under a directory
            if (last(parts) === '*') {
                keyfix = null;
                rec = true;
                parts.length = parts.length - 1;
            }
            if (parts.length > 1) {
                // do some freaking magic
                map(parts, function (each, i) {
                    var lastPath = last(paths) || eventsObj,
                        part = '_:' + each;
                    paths.push(lastPath[part]);
                });
                endObj = last(paths);
            } else {
                endObj = eventsObj['_:' + parts[0]];
            }
            // only try to invoke if the object exists.  we don't want errors
            if (endObj) {
                // check if we were passed a key
                if (keyfix) {
                    // isolate the key in the object and run it
                    if (endObj[keyfix]) {
                        endObj[keyfix].apply(null, args);
                    }
                } else {
                    // if the event specified all events and sub events...
                    if (rec) {
                        chart(endObj, function (v, k) {
                            if (k.slice(0, 2) === '_:') {
                                // recurse if the value is a directory
                                if (k !== '_::name') {
                                    that.fire(parts.join('/') + '/' + k.slice(2) + '/*', args);
                                }
                            } else {
                                // invoke if it's an event
                                v.apply(null, args);
                            }
                        });
                    } else {
                        // run all non-meta keys in the object
                        chart(endObj, function (v, k) {
                            if (k.slice(0, 2) !== '_:') {
                                v.apply(null, args);
                            }
                        });
                    }
                }
            }
        },
        "listen" : function (ev, key, fn) {
            var keyfix, parts, paths = [], finalPath, finalPart;
            ev = formatEvent(ev);
            parts = ev.split('/');
            if (last(parts) === '*') {
                parts.length = parts.length - 1;
            }
            if (!fn && typeof key === 'function') {
                fn = key;
                keyfix = genUnique();
            } else {
                keyfix = key;
            }
            if (parts.length > 1) {
                // make sure an object exists or is created for the event and every sub event underneath it
                map(parts, function (each, i) {
                    // do some freaking magic
                    var lastPath = last(paths) || eventsObj,
                        part = '_:' + each;
                    lastPath[part] = lastPath[part] || new EvDir(each);
                    paths.push(lastPath[part]);
                });
                // and don't forget to actually subscribe the function
                finalPath = last(paths);
                finalPath[keyfix] = fn;
            } else {
                finalPart = '_:' + parts[0];
                eventsObj[finalPart] = eventsObj[finalPart] || new EvDir(parts[0]);
                // subscribe the function to the event
                eventsObj[finalPart][keyfix] = fn;
            }
            // publish the newListener event
            this.fire('newListener', [ev, keyfix, fn]);
            return keyfix;
        },
        "remove" : function (ev, key) {
            var parts, paths = [], endObj, endParent;
            ev = formatEvent(ev);
            parts = ev.split('/');
            if (last(parts) === '*') {
                parts.length = parts.length - 1;
            }
            if (parts.length > 1) {
                map(parts, function (each, i) {
                    var lastPath = last(paths) || eventsObj,
                        part = '_:' + each;
                    paths.push(lastPath[part]);
                });
                endObj = last(paths);
                endParent = last(lead(paths));
            } else {
                endObj = eventsObj[parts[0]];
                endParent = eventsObj;
            }
            if (key && endObj[key]) {
                delete endObj[key];
                delete keysUsed[key];
                this.fire('rmListener', [ev, key]);
            } else if (!key) {
                chart(endObj, function (v, k) {
                    delete keysUsed[k];
                });
                delete endParent['_:' + ((endObj) ? endObj['_::name'] : parts[0])];
                this.fire('rmEvent', [ev]);
            }
        },
        "try" : function (ev, key, fn) {
            var keyfix;
            if (!fn && typeof key === 'function') {
                fn = key;
            } else {
                keyfix = key;
            }
            try {
                fn();
            } catch (err) {
                if (keyfix) {
                    this.fire(ev, keyfix, [err]);
                } else {
                    this.fire(ev, [err]);
                }
                if (ev !== 'tryError') {
                    if (keyfix) {
                        this.fire('tryError', keyfix, [err]);
                    } else {
                        this.fire('tryError', [err]);
                    }
                }
            }
        },
        "getEvents" : function () {
            return eventsObj;
        },
        "version" : version
    };

    // exports to multiple environments

    // AMD
    if (context.define && typeof context.define === 'function' && context.define.amd) {
        context.define('SHOTGUN', [], sg);
        context.define('SG', [], sg);
    // weird stuff
    } else if (context.module && context.module.exports) {
        context.module.exports = sg;
    // browser & node
    } else {
        // use string because of Google closure compiler ADVANCED_MODE
        context['SHOTGUN'] = context['SG'] = sg;
    }

}(this));