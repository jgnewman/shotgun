# Shotgun.js

> Smarter than your average pubsub library.

Shotgun.js is a custom event manager for JavaScript.  Built on the observer pattern, 
you can tell functions to listen for events that you define and manually fire those events at will.  As
an added benefit, you can easily unsubscribe any function from any event, even if your function isn't
named.  Shotgun.js also publishes trappable, internal events as you use it.

Shotgun passes JSLint (except for one optimization meant for Google Closure Compiler ADVANCED_MODE), 
can be installed anywhere, and is also cross-browser compatible.  By default, it attaches a
namespace called SHOTGUN to the global object.  You can also use SG as a shorcut for this.

> As of v2.0, Shotgun has a completely revamped events syntax built to work and feel like a directory
> system.  You can now group events together under event directories and sub-directories.  As such,
> you will no longer pass in arrays of keys when you want to publish a specific group of events since
> you can simply store those events under sub-directories.
  
Here's how it works:

## Creating Subscriptions

When you create an event subscription with Shotgun, you are, in essence, telling a specific 
function to listen for the firing of some event and then invoke itself when it hears that event 
fired.  The event will publish an array of arguments that the function will take into itself 
upon invocation.  Let's look at an example:

```javascript

var eventKey = SHOTGUN.listen('myEvent', 'myKeyName', function (x, y) {
	return x + y;
});

// returns => 'myKeyName'

```

In the above example we passed 3 arguments to **SHOTGUN.listen**.  The first argument contains
the name of the event your function will subscribe to.  The last argument contains the function 
that should be invoked when the event is fired.  But the real secret to Shotgun.js is the 
middle argument: the subscription key.  

With a subscription key, you can uniquely name each of your individual subscriptions.  If you don't 
pass a key name to **SHOTGUN.listen**, a random 24 character key will be generated for you.  Doing
it that way would look like this:

```javascript

var eventKey = SHOTGUN.listen('myEvent', function (x, y) {
	return x + y;
});

// returns something like => 'eejHGuiDswqttrLPPOlikrgu'

```
 
**SHOTGUN.listen** returns your subscription key so that you will have it available for use in 
the future.  All random keys are guaranteed to be unique.

You can subscribe as many functions to an event name as you want but you can not subscribe more 
than one function using the same key. If you try to give two subscriptions the same key, the 
first subscription will disappear, being overridden by the the second.  Uniquely naming your 
keys will allow you to delete any subscription, whether the function is named or not.

Note: You don't have to do anything special to create an event for the first time.  When you make 
a subscription, Shotgun.js will check to see if that event already exists.  If not, it will be 
created for you.

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

SHOTGUN.listen('myEvent', 'keyName', function (x, y) {
	return x + y;
});
// returns => 'keyName'

SHOTGUN.listen('myEvent', 'keyName2', function (x, y) {
	return x - y;
});
// returns => 'keyName2'

SHOTGUN.listen('myEvent/subEvent1', function (x, y) {
	return x * y;
});
// returns something like => 'rJkB3oeekYLdQDvgG4LaRB9Y'

SHOTGUN.listen('myEvent/subEvent2', function (x, y) {
	return x / y;
});
// returns another random key

```

We now have 2 function subscribed directly to **myEvent**.  This event also has two sub-events
underneath it, each with its own function subscription.  When we fire an event, we publish an
array of arguments to an event directory.  Each function subscribed to that event directory will
then be invoked, taking the arguments into itself.  In the simplest case, we might do this:

```javascript

SHOTGUN.fire('myEvent', [2, 2]);

// Two functions run...
//     The first returns 4.
//     The second returns 0.

```

In the above example, only the functions directly subscribed to **myEvent** run.  And if we only
wanted to run one of them, we could pass in the subscription key as well:

```javascript

SHOTGUN.fire('myEvent', 'keyName', [2, 2]);

// One function runs.  It returns 4.   

```

As you can see above, the subscription key uniquely identifies a single function to which you 
would like to publish your arguments.

Of course, firing a sub event is as easy as firing a parent event:

```javascript

SHOTGUN.fire('myEvent/subEvent1', [2, 4]);

// One function runs.  It returns 8.

```

That said, you may also want to fire an umbrella event and have it invoke not only the functions
directly subscribed to that event, but also all functions subscribed to sub-events underneath it.
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
want to be congniscent of what you're doing when you use this technique however, because it does
work recursively.  Of course, you won't risk blowing out the call stack unless you have created
hundreds of levels of nested sub-events.  But you should know to avoid creating hundreds of levels
of nested sub-events and then using an asterisk at the top level.


## Unsubscribing

Once you make a subscription, it exists until you either remove it manually or override it 
with another subscription.  That's OK because subscription keys give us a way to easily do 
that.  We just call **SHOTGUN.remove**.

```javascript

SHOTGUN.remove('event/subEvent/subsubEvent', 'uniqueKey');

// A function is unsubscribed from 'myCustomEvent'

```

In the above example we removed a single subscription from an event.  However, we can also 
remove all subscriptions from an event simply by not passing in a key to **SHOTGUN.remove**.

```javascript

SHOTGUN.remove('event/subEvent/subsubEvent');

// The entire "subsubEvent" and all subscriptions to it are removed.

```

## Better Error Handling

Shotgun makes it so you never have to write another ugly try/catch block ever again.  
Take a look at the following code:

```javascript

function parseJSON(obj) {
	SHOTGUN.try('errors/parseJSON', function() {
		JSON.parse(obj);
	});
}

SHOTGUN.listen('errors/parseJSON', function (err) {
	doSomethingWith(err);
});

parseJSON('asdfasdfasdfadefasdf');
// The error is caught by SHOTGUN.listen.
// Launches doSomethingWith(err);


```

In the above code we define a function that calls **SHOTGUN.try** rather than setting up a 
traditional try block. **SHOTGUN.try** runs a try under the hood and publishes the error 
to an events channel for you within the catch block if an error occurs.

This way, you can 
catch the error with **SHOTGUN.listen** and completely decouple your error handling from 
your normal work flow.  In fact, you can even catch multiple errors with a single **.listen** and,
if you want to, recursively call your try block again using the events channel.

## Internal Events

You might be interested to know that Shotgun publishes events for you to trap whenever you 
make a subscription or remove a subscription.  There is no trappable event when a publish 
occurs because that would suck you into an infinite loop.  Nobody wants that.  
Anyway, here are your internal events:

```javascript

// newListener -> Fired any time a subscription is made
SHOTGUN.listen('newListener', function (ev, key, fn) {
		// ev  === the event name (in this case 'newListener')
		// key === the subscirption key
		// fn  === the function that subscribed to the event
});

// rmListener -> Fired any time a specific subscription is removed
SHOTGUN.listen('rmListener', function (ev, key) {
		// ev  === the event name (in this case 'rmListener')
		// key === the subscirption key
});

// rmEvent -> Fired any time you delete an entire event and all its subscriptions
SHOTGUN.listen('rmEvent', function (ev) {
		// ev === the event name (in this case 'rmEvent')
});

// tryError -> Fired any time SHOTGUN.try publishes an error
SHOTGUN.listen('tryError', function (err) {
		// err === the error object
});

```

## Keeping Track

Lastly, you can always get a look at the current state of Shotgun.js subscriptions by calling
**SHOTGUN.getEvents**.

```javascript

SHOTGUN.getEvents()

/*
returns an object like this =>
{
	"_::name" : 'myEvent',
	"_:subEvent" : [object],
	"rJkB3oeekYLdQDvgG4LaRB9Y" : [function],
	"eejHGuiDswqttrLPPOlikrgu" : [function]
}
*/

```

Notice in the example object returned that each directory and sub-directory is really just
an object.  Each one has **_::name** property containing the name you've given it.  All event
sub-directories also begin with **_:**.  For this reason among others, you should only use
letters and numbers in your event names and subscription keys.

Since **getEvents** gives you such an honest look at the state of your subscriptions and their
names, you will need to keep that in mind when drilling down to look into sub-levels.  This
tool is really meant for debugging as you will probably not need to really use it for any
reason in your code.