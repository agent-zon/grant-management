</> htmx
docs
reference
examples
talk
essays
🔍️

Animations
htmx is designed to allow you to use CSS transitions to add smooth animations and transitions to your web page using only CSS and HTML. Below are a few examples of various animation techniques.

htmx also allows you to use the new View Transitions API for creating animations.

Basic CSS Animations
Color Throb
The simplest animation technique in htmx is to keep the id of an element stable across a content swap. If the id of an element is kept stable, htmx will swap it in such a way that CSS transitions can be written between the old version of the element and the new one.

Consider this div:

<style>
.smooth {
  transition: all 1s ease-in;
}
</style>
<div id="color-demo" class="smooth" style="color:red"
      hx-get="/colors" hx-swap="outerHTML" hx-trigger="every 1s">
  Color Swap Demo
</div>

This div will poll every second and will get replaced with new content which changes the color style to a new value (e.g. blue):

<div id="color-demo" class="smooth" style="color:blue"
      hx-get="/colors" hx-swap="outerHTML" hx-trigger="every 1s">
  Color Swap Demo
</div>
Because the div has a stable id, color-demo, htmx will structure the swap such that a CSS transition, defined on the .smooth class, applies to the style update from red to blue, and smoothly transitions between them.

Demo
Color Swap Demo
Smooth Progress Bar
The Progress Bar demo uses this basic CSS animation technique as well, by updating the length property of a progress bar element, allowing for a smooth animation.

Swap Transitions
Fade Out On Swap
If you want to fade out an element that is going to be removed when the request ends, you want to take advantage of the htmx-swapping class with some CSS and extend the swap phase to be long enough for your animation to complete. This can be done like so:

<style>
.fade-me-out.htmx-swapping {
  opacity: 0;
  transition: opacity 1s ease-out;
}
</style>
<button class="fade-me-out"
        hx-delete="/fade_out_demo"
        hx-swap="outerHTML swap:1s">
        Fade Me Out
</button>
Demo
Delete Me

Settling Transitions
Fade In On Addition
Building on the last example, we can fade in the new content by using the htmx-added class during the settle phase. You can also write CSS transitions against the target, rather than the new content, by using the htmx-settling class.

<style>
#fade-me-in.htmx-added {
  opacity: 0;
}
#fade-me-in {
  opacity: 1;
  transition: opacity 1s ease-out;
}
</style>
<button id="fade-me-in"
        class="btn primary"
        hx-post="/fade_in_demo"
        hx-swap="outerHTML settle:1s">
        Fade Me In
</button>
Demo
Fade Me In

Request In Flight Animation
You can also take advantage of the htmx-request class, which is applied to the element that triggers a request. Below is a form that on submit will change its look to indicate that a request is being processed:

<style>
  form.htmx-request {
    opacity: .5;
    transition: opacity 300ms linear;
  }
</style>
<form hx-post="/name" hx-swap="outerHTML">
<label>Name:</label><input name="name"><br/>
<button class="btn primary">Submit</button>
</form>
Demo
Submitted!
Using the htmx class-tools Extension
Many interesting animations can be created by using the class-tools extension.

Here is an example that toggles the opacity of a div. Note that we set the toggle time to be a bit longer than the transition time. This avoids flickering that can happen if the transition is interrupted by a class change.

<style>
.demo.faded {
  opacity:.3;
}
.demo {
  opacity:1;
  transition: opacity ease-in 900ms;
}
</style>
<div class="demo" classes="toggle faded:1s">Toggle Demo</div>
Demo
Toggle Demo
Using the View Transition API
htmx provides access to the new View Transitions API via the transition option of the hx-swap attribute.

Below is an example of a swap that uses a view transition. The transition is tied to the outer div via a view-transition-name property in CSS, and that transition is defined in terms of ::view-transition-old and ::view-transition-new, using @keyframes to define the animation. (Fuller details on the View Transition API can be found on the Chrome Developer Page on them.)

The old content of this transition should slide out to the left and the new content should slide in from the right.

Note that, as of this writing, the visual transition will only occur on Chrome 111+, but more browsers are expected to implement this feature in the near future.

<style>
   @keyframes fade-in {
     from { opacity: 0; }
   }

   @keyframes fade-out {
     to { opacity: 0; }
   }

   @keyframes slide-from-right {
     from { transform: translateX(90px); }
   }

   @keyframes slide-to-left {
     to { transform: translateX(-90px); }
   }

   .slide-it {
     view-transition-name: slide-it;
   }

   ::view-transition-old(slide-it) {
     animation: 180ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
     600ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-left;
   }
   ::view-transition-new(slide-it) {
     animation: 420ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in,
     600ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-right;
   }
</style>


<div class="slide-it">
   <h1>Initial Content</h1>
   <button class="btn primary" hx-get="/new-content" hx-swap="innerHTML transition:true" hx-target="closest div">
     Swap It!
   </button>
</div>
Demo
Initial Content
Swap It!
Conclusion
You can use the techniques above to create quite a few interesting and pleasing effects with plain old HTML while using htmx.

haiku
javascript fatigue:
longing for a hypertext
already in hand

docs
reference
examples
talk
essays
@htmx_org
</> htmx
docs
reference
examples
talk
essays
🔍️
hx-on
The hx-on* attributes allow you to embed scripts inline to respond to events directly on an element; similar to the onevent properties found in HTML, such as onClick.

The hx-on* attributes improve upon onevent by enabling the handling of any arbitrary JavaScript event, for enhanced Locality of Behaviour (LoB) even when dealing with non-standard DOM events. For example, these attributes allow you to handle htmx events.

With hx-on attributes, you specify the event name as part of the attribute name, after a colon. So, for example, if you want to respond to a click event, you would use the attribute hx-on:click:

<div hx-on:click="alert('Clicked!')">Click</div>
Note that this syntax can be used to capture all htmx events, as well as most other custom events, in addition to the standard DOM events.

One gotcha to note is that DOM attributes do not preserve case. This means, unfortunately, an attribute like hx-on:htmx:beforeRequest will not work, because the DOM lowercases the attribute names. Fortunately, htmx supports both camel case event names and also kebab-case event names, so you can use hx-on:htmx:before-request instead.

In order to make writing htmx-based event handlers a little easier, you can use the shorthand double-colon hx-on:: for htmx events, and omit the “htmx” part:

<!-- These two are equivalent -->
<button hx-get="/info" hx-on:htmx:before-request="alert('Making a request!')">
    Get Info!
</button>

<button hx-get="/info" hx-on::before-request="alert('Making a request!')">
    Get Info!
</button>

If you wish to handle multiple different events, you can simply add multiple attributes to an element:

<button hx-get="/info"
        hx-on::before-request="alert('Making a request!')"
        hx-on::after-request="alert('Done making a request!')">
    Get Info!
</button>
Finally, in order to make this feature compatible with some templating languages (e.g. JSX) that do not like having a colon (:) in HTML attributes, you may use dashes in the place of colons for both the long form and the shorthand form:

<!-- These two are equivalent -->
<button hx-get="/info" hx-on-htmx-before-request="alert('Making a request!')">
    Get Info!
</button>

<button hx-get="/info" hx-on--before-request="alert('Making a request!')">
    Get Info!
</button>

hx-on (deprecated)
The value is an event name, followed by a colon :, followed by the script:

<button hx-get="/info" hx-on="htmx:beforeRequest: alert('Making a request!')">
    Get Info!
</button>
Multiple handlers can be defined by putting them on new lines:

<button hx-get="/info" hx-on="htmx:beforeRequest: alert('Making a request!')
                              htmx:afterRequest: alert('Done making a request!')">
    Get Info!
</button>
Symbols
Like onevent, two symbols are made available to event handler scripts:

this - The element on which the hx-on attribute is defined
event - The event that triggered the handler
Notes
hx-on is not inherited, however due to event bubbling, hx-on attributes on parent elements will typically be triggered by events on child elements
hx-on:* and hx-on cannot be used together on the same element; if hx-on:* is present, the value of an hx-on attribute on the same element will be ignored. The two forms can be mixed in the same document, however.
haiku
javascript fatigue:
longing for a hypertext
already in hand

docs
reference
examples
talk
essays
@htmx_org

</> htmx
docs
reference
examples
talk
essays
🔍️
hx-trigger
The hx-trigger attribute allows you to specify what triggers an AJAX request. A trigger value can be one of the following:

An event name (e.g. “click” or “my-custom-event”) followed by an event filter and a set of event modifiers
A polling definition of the form every <timing declaration>
A comma-separated list of such events
Standard Events
Standard events refer to web API events (e.g. click, keydown, mouseup, load).

A standard event, such as click can be specified as the trigger like so:

<div hx-get="/clicked" hx-trigger="click">Click Me</div>
Standard Event Filters
Events can be filtered by enclosing a boolean javascript expression in square brackets after the event name. If this expression evaluates to true the event will be triggered, otherwise it will be ignored. Standard event filters require eval.

<div hx-get="/clicked" hx-trigger="click[ctrlKey]">Control Click Me</div>
This event will trigger if a click event is triggered with the event.ctrlKey property set to true.

Conditions can also refer to global functions or state

<div hx-get="/clicked" hx-trigger="click[checkGlobalState()]">Control Click Me</div>
And can also be combined using the standard javascript syntax

<div hx-get="/clicked" hx-trigger="click[ctrlKey&&shiftKey]">Control-Shift Click Me</div>
Note that all symbols used in the expression will be resolved first against the triggering event, and then next against the global namespace, so myEvent[foo] will first look for a property named foo on the event, then look for a global symbol with the name foo

Standard Event Modifiers
Standard events can also have modifiers that change how they behave. The modifiers are:

once - the event will only trigger once (e.g. the first click)
changed - the event will only fire if the value of the element has changed. Please pay attention change is the name of the event and changed is the name of the modifier.
delay:<timing declaration> - a delay will occur before an event triggers a request. If the event is seen again it will reset the delay.
throttle:<timing declaration> - a throttle will occur after an event triggers a request. If the event is seen again before the delay completes, it is ignored, the element will trigger at the end of the delay.
from:<Extended CSS selector> - allows the event that triggers a request to come from another element in the document (e.g. listening to a key event on the body, to support hot keys)
A standard CSS selector resolves to all elements matching that selector. Thus, from:input would listen on every input on the page.
The CSS selector is only evaluated once and is not re-evaluated when the page changes. If you need to detect dynamically added elements use a standard event filter, for example hx-trigger="click[event.target.matches('button')] from:body" which would catch click events from every button on the page.
The extended CSS selector here allows for the following non-standard CSS values:
document - listen for events on the document
window - listen for events on the window
closest <CSS selector> - finds the closest ancestor element or itself, matching the given css selector
find <CSS selector> - finds the closest child matching the given css selector
next resolves to element.nextElementSibling
next <CSS selector> scans the DOM forward for the first element that matches the given CSS selector. (e.g. next .error will target the closest following sibling element with error class)
previous resolves to element.previousElementSibling
previous <CSS selector> scans the DOM backwards for the first element that matches the given CSS selector. (e.g. previous .error will target the closest previous sibling with error class)
target:<CSS selector> - allows you to filter via a CSS selector on the target of the event. This can be useful when you want to listen for triggers from elements that might not be in the DOM at the point of initialization, by, for example, listening on the body, but with a target filter for a child element
consume - if this option is included the event will not trigger any other htmx requests on parents (or on elements listening on parents)
queue:<queue option> - determines how events are queued if an event occurs while a request for another event is in flight. Options are:
first - queue the first event
last - queue the last event (default)
all - queue all events (issue a request for each event)
none - do not queue new events
Here is an example of a search box that searches on input, but only if the search value has changed and the user hasn’t typed anything new for 1 second:

<input name="q"
       hx-get="/search" hx-trigger="input changed delay:1s"
       hx-target="#search-results"/>
The response from the /search url will be appended to the div with the id search-results.

Non-standard Events
There are some additional non-standard events that htmx supports:

load - triggered on load (useful for lazy-loading something)
revealed - triggered when an element is scrolled into the viewport (also useful for lazy-loading). If you are using overflow in css like overflow-y: scroll you should use intersect once instead of revealed.
intersect - fires once when an element first intersects the viewport. This supports two additional options:
root:<selector> - a CSS selector of the root element for intersection
threshold:<float> - a floating point number between 0.0 and 1.0, indicating what amount of intersection to fire the event on
Triggering via the HX-Trigger header
If you’re trying to fire an event from HX-Trigger response header, you will likely want to use the from:body modifier. E.g. if you send a header like this HX-Trigger: my-custom-event with a response, an element would likely need to look like this:

  <div hx-get="/example" hx-trigger="my-custom-event from:body">
    Triggered by HX-Trigger header...
  </div>
in order to fire.

This is because the header will likely trigger the event in a different DOM hierarchy than the element that you wish to be triggered. For a similar reason, you will often listen for hot keys from the body.

Polling
By using the syntax every <timing declaration> you can have an element poll periodically:

<div hx-get="/latest_updates" hx-trigger="every 1s">
  Nothing Yet!
</div>
This example will issue a GET to the /latest_updates URL every second and swap the results into the innerHTML of this div.

If you want to add a filter to polling, it should be added after the poll declaration:

<div hx-get="/latest_updates" hx-trigger="every 1s [someConditional]">
  Nothing Yet!
</div>
Multiple Triggers
Multiple triggers can be provided, separated by commas. Each trigger gets its own options.

  <div hx-get="/news" hx-trigger="load, click delay:1s"></div>
This example will load /news immediately on page load, and then again with a delay of one second after each click.

Via JavaScript
The AJAX request can be triggered via JavaScript htmx.trigger(), too.

Notes
hx-trigger is not inherited
hx-trigger can be used without an AJAX request, in which case it will only fire the htmx:trigger event
In order to pass a CSS selector that contains whitespace (e.g. form input) to the from- or target-modifier, surround the selector in parentheses or curly brackets (e.g. from:(form input) or from:closest (form input))
A reset event in hx-trigger (e.g. hx-trigger=“change, reset”) might not work as intended, since HTMX builds its values and sends a request before the browser resets the form values. As a workaround, add a delay to let the browser reset the form before making the request (e.g. hx-trigger=“change, reset delay:0.01s”).
haiku
javascript fatigue:
longing for a hypertext
already in hand

docs
reference
examples
talk
essays
@htmx_org
