# Shotgun.js

> Smarter than your average event library.

Shotgun.js is a custom event manager for JavaScript.  Built on the observer pattern, 
you can tell functions to listen for events that you define and manually fire those events at will.  As
an added benefit, you can nest sub events under parent events, invoke single subscriptions or groups of
functions at once, abstract try/catch blocks out of your code, and easily unsubscribe any function from
any event, even if your function isn't
named.  Shotgun.js also publishes trappable, internal events as you use it.

Shotgun passes JSLint (with nomen set to true), 
can be installed anywhere, and is also cross-browser compatible.  By default, it attaches a
namespace called `SHOTGUN` to the global object.  You can also use `SG` as a shorcut for this.

### New since version 3.0

- Support for internal events makes it better for integrating with larger frameworks.
- Since it is least frequently used, key is now always the last argument.
- `SG.try` has been renamed SG.attempt for linting purposes.
- `SG.attempt` now passes the function you tried to call along with the error to the error listener.
- Smarter, faster, more organized directory structure.
- A better unique ID generator that doesn't have to check previously generated IDs.
- Less code.
  
Here's how it works:

## Creating Subscriptions

When you create an event subscription with Shotgun, you are, in essence, telling a specific 
function to listen for the firing of some event and then invoke itself when it hears that event 
fired.  The event will publish an array of arguments that the function will take into itself 
upon invocation.  Let's look at an example:

```javascript

var eventKey = SHOTGUN.listen('myEvent', function (x, y) {
    return x + y;
}, 'myKeyName');

// returns => 'myKeyName'

```

In the above example we passed 3 arguments to `SHOTGUN.listen`.  The first argument contains
the name of the event your function will subscribe to.  The second argument contains the function 
that should be invoked when the event is fired.  But the real secret to Shotgun.js is the 
third argument: the subscription key.  

With a subscription key, you can uniquely name each of your individual subscriptions.  If you don't 
pass a key name to `SHOTGUN.listen`, a unique identifier will be generated for you.  Thus every
subscription you make is uniquely identifiable.

Doing it that way would look like this:

```javascript

var eventKey = SHOTGUN.listen('myEvent', function (x, y) {
    return x + y;
});

// returns something like => 'SG-1343752842713-1000000-AQ1ImxURDmsAVn9WEkJeFqv37'

```
 
`SHOTGUN.listen` returns your subscription key so that you will have it available for use in 
the future.  All keys are virtually guaranteed to be unique.

You can subscribe as many functions to an event name as you want but you can not subscribe more 
than one function using the same key. If you try to give two subscriptions the same key, the 
first subscription will disappear, being overridden by the the second.  Uniquely naming your 
keys will allow you to delete any subscription, whether the function is named or not.

> NOTE: You can name your events and keys whatever you want as long as you don't prefix them with
> an underbar.  The underbar is used internally by the system and, although unlikely, there is a chance
> of overwriting important functionality if you use this prefix.

It's good to know that you don't have to do anything special to create an event for the first time.
When you make a subscription, Shotgun will check to see if that event already exists.  If not, it
will be created for you.

Shotgun also gives you the ability to nest your events into directories.  For example, you might
do something like this:

```javascript

SHOTGUN.listen('myEvents/subEvent1', function (x, y) {
    return x + y;
});

SHOTGUN.listen('myEvents/subEvent2', function (x, y) {
    return x - y;
});

```

In the above example, we have created two sub-directories under "myEvents".  This technique will
allow you to organize your subscriptions into invocable groups.

Now let's fire an event.

## Firing (Publishing) Events

In order to demonstrate how firing events works, we will first need to make a few subscriptions:

```javascript

SHOTGUN.listen('myEvent', function (x, y) { return x + y; }, 'keyName');
// returns => 'keyName'

SHOTGUN.listen('myEvent', function (x, y) { return x - y; }, 'keyName2');
// returns => 'keyName2'

SHOTGUN.listen('myEvent/subEvent1', function (x, y) { return x * y; });
// returns something like => 'SG-1343758622682-1000000-RitTbZ6D3G8Lxqzw1zX28igDk'

SHOTGUN.listen('myEvent/subEvent2', function (x, y) { return x / y; });
// returns another unique key

```

We now have 2 functions subscribed directly to `myEvent`.  This event also has two sub-events
underneath it, each with its own function subscription.  When we fire an event, we publish an
array of arguments to an event directory.  Each function subscribed to that event directory will
then be invoked, taking the arguments into itself.  In the simplest case, we might do this:

```javascript

SHOTGUN.fire('myEvent', [2, 2]);

// Two functions run...
//     The first returns 4.
//     The second returns 0.

```

In the above example, only the functions directly subscribed to `myEvent` run.  And if we only
wanted to run one of them, we could pass in the subscription key as well:

```javascript

SHOTGUN.fire('myEvent', [2, 2], 'keyName');

// One function runs.  It returns 4.   

```

As you can see above, the subscription key uniquely identifies a single function to which you 
would like to publish your arguments.

Of course, firing a sub event is no more difficult than firing its parent:

```javascript

SHOTGUN.fire('myEvent/subEvent1', [2, 4]);

// One function runs.  It returns 8.

```

That said, you may also want to fire an umbrella event and have it invoke not only the functions
directly subscribed to it, but also all functions subscribed to sub-events underneath it.
In that case you will do this:

```javascript

SHOTGUN.fire('myEvent/*', [2, 4]);

// Four functions run.
//     The first returns 6.
//     The second returns -2.
//     The third returns 8.
//     The fourth returns .5.

```

Using an asterisk tells Shotgun "I want you to invoke EVERYTHING underneath this event."  You'll
want to be cognisant of what you're doing when you use this technique however, because it does
work recursively.  Of course, you won't risk blowing out the call stack unless you have created
hundreds of levels of nested sub-events.  But you should know to avoid creating hundreds of levels
of nested sub-events and then using an asterisk at the top level.


## Unsubscribing

Once you make a subscription, it exists until you either remove it manually or override it 
with another subscription.  That's OK because subscription keys give us a way to easily do 
that.  We just call `SHOTGUN.remove`.

```javascript

SHOTGUN.remove('event/subEvent/subsubEvent', 'uniqueKey');

// The function associated with 'uniqueKey' is unsubscribed from 'event/subEvent/subsubEvent'

```

In the above example we removed a single subscription from an event.  However, we can also 
remove all subscriptions from an event simply by not passing in a key to `SHOTGUN.remove`.

```javascript

SHOTGUN.remove('event/subEvent/subsubEvent');

// The entire 'subsubEvent', any sub-events underneath it, and all subscriptions to it are removed.

```

## Better Error Handling

Shotgun makes it so you never have to write another ugly try/catch block ever again. Take a look at the following code:

```javascript

function parseJSON(obj) {
    SHOTGUN.attempt('errors/parseJSON', function() {
        JSON.parse(obj);
    });
}

SHOTGUN.listen('errors/parseJSON', function (err, fn) {
    doSomethingWith(err);
    maybeFixSomething();
    maybeTryInvokingAgain(fn);
});

parseJSON('asdfasdfasdfadefasdf');
// The error is caught by SHOTGUN.listen.
// All functions listening on this channel are invoked.


```

In the above code we define a function that calls `SHOTGUN.attempt` rather than setting up a 
traditional try block. `SHOTGUN.attempt` runs a try under the hood and publishes the error 
to an events channel for you within the catch block if an error occurs.

This way, you can 
catch the error with `SHOTGUN.listen` and completely decouple your error handling from 
your normal work flow.  In fact, you can even catch multiple errors with a single `.listen`,
catch a single error with multiple functions, and, if you want to, recursively call your attempt
again.

Incidentally, you don't actually have to pass in an event name when you call `SHOTGUN.attempt`.
Any time this function catches an error, it publishes an internal event called `_internal/tryError`.  Because
of this you can create subscriptions to the `_internal/tryError` event and do all of your error handling that
way if you want.

## Internal Events

You might be interested to know that Shotgun publishes several internal events for you to trap
whenever you 
make a subscription or remove a subscription.  There is no trappable event when a publish 
occurs because that would suck you into an infinite loop.
Here are your internal events:

```javascript

// newListener -> Fired any time a subscription is made
SHOTGUN.listen('_internal/newListener', function (ev, fn, key) {
        // ev  === the event name (in this case 'newListener')
        // fn  === the function that subscribed to the event
        // key === the subscirption key
});

// rmListener -> Fired any time a specific subscription is removed
SHOTGUN.listen('_internal/rmListener', function (ev, key) {
        // ev  === the event name from which the listener was removed
        // key === the subscirption key
});

// rmEvent -> Fired any time you delete an entire event and all its subscriptions
SHOTGUN.listen('_internal/rmEvent', function (ev) {
        // ev === the event name you removed
});

// tryError -> Fired any time SHOTGUN.try publishes an error
SHOTGUN.listen('_internal/tryError', function (err, fn) {
        // err === the error object
        // fn  === the function you tried to invoke with SHOTGUN.attempt
});

```

If you are using Shotgun as a component of a larger framework, providing access to its functionality indirectly
through your own API, you may want the ability to create your own internal events.  Internal events are useful
because they are not stored in the same place regular events are stored.  This means that as the user creates
events, there will be no risk of overwriting any internal events you may have created.

Creating a new internal event is not as easy as simply subscribing to it and assuming that it now exists due to
the subscription.  Instead, to register an internal event, you'll call `SHOTGUN.registerInternal`:

```javascript
SG.registerInternal('myInternalEvent');

// also...

SG.registerInternal('myInternalEvent/subEvent1');

// also...

SG.registerInternal('event1', 'event2', 'event3');
```

If you attempt to subscribe to a custom internal event without registering that event first, Shotgun will produce
an error.  Notice that `.registerInternal` can register entire internal directory chains at once and can take as
many event names you'd like to give it as arguments.

When firing or removing an internal event, or when listening for an internal event via `SHOTGUN.attempt`, you must
prefix your event name with the string '_internal' as follows:

```javascript
SG.fire('_internal/myInternalEvent');

SG.remove('_internal/myInternalEvent');

SG.attempt('_internal/myInternalError', function () { ... })
```

The '_internal' prefix tells Shotgun to look for the event in the `InternalEvents` directory rather than in the
standard directory.  Notice that you do not need to use this prefix when registering internal events.


## Keeping Track

Lastly, you can always get a look at the current state of Shotgun.js subscriptions by calling
`SHOTGUN.getEvents`.

```javascript

SHOTGUN.getEvents()

// returns an object like this =>
Events
{
    myEvent: Directory {
        subEvent1 : Directory...
        subEvent2 : Directory...
        __proto__ : {
            _SG_dirName      : 'myEvent'
            _SG_dirEvents    : {
                SG-1343761487322-1000001-Gm1NffMg0YwceytkPaYpY27qE : Function...
                SG-1343761507023-1000002-Rm0OoSVoAglnGgqkYpNWnQYMA : Function...
            },
            _SG_dirEventsKey : SG-1343761371901-1000000-LlqD3cIgLobFqbSgv28ICp84r,
            _SG_parentDir    : Directory...
        }
    }
}


```

Notice in the example object returned that events associated with a given directory are accessible
via the directory's prototype.  This allows Shotgun to do faster iterations without having to
sort out which properties are directories and which properties are direct subscriptions.

Also notice that registered internal events are NOT found in this directory.  To view all registered
internal events, call `SHOTGUN.getInternalEvents`.  It will return an object very much the same as
the object returned by `getEvents` except it will show only registered internal events.

