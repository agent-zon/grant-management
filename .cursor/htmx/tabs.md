---tabs-js  

Tabs (Using JavaScript)
This example shows how to load tab contents using htmx, and to select the “active” tab using Javascript. This reduces some duplication by offloading some of the work of re-rendering the tab HTML from your application server to your clients’ browsers.

You may also consider a more idiomatic approach that follows the principle of Hypertext As The Engine Of Application State.

Example Code
The HTML below displays a list of tabs, with added HTMX to dynamically load each tab pane from the server. A simple JavaScript event handler uses the take function to switch the selected tab when the content is swapped into the DOM.


<div id="tabs" hx-target="#tab-contents" role="tablist"
     hx-on:htmx-after-on-load="let currentTab = document.querySelector('[aria-selected=true]');
                               currentTab.setAttribute('aria-selected', 'false')
                               currentTab.classList.remove('selected')
                               let newTab = event.target
                               newTab.setAttribute('aria-selected', 'true')
                               newTab.classList.add('selected')">
    <button role="tab" aria-controls="tab-contents" aria-selected="true" hx-get="/tab1" class="selected">Tab 1</button>
    <button role="tab" aria-controls="tab-contents" aria-selected="false" hx-get="/tab2">Tab 2</button>
    <button role="tab" aria-controls="tab-contents" aria-selected="false" hx-get="/tab3">Tab 3</button>
</div>

<div id="tab-contents" role="tabpanel" hx-get="/tab1" hx-trigger="load"></div>


----tyabs hateos
</> htmx
docs
reference
examples
talk
essays
🔍️

Tabs (Using HATEOAS)
This example shows how easy it is to implement tabs using htmx. Following the principle of Hypertext As The Engine Of Application State, the selected tab is a part of the application state. Therefore, to display and select tabs in your application, simply include the tab markup in the returned HTML. If this does not suit your application server design, you can also use a little bit of JavaScript to select tabs instead.

Example Code (Main Page)
The main page simply includes the following HTML to load the initial tab into the DOM.

<div id="tabs" hx-get="/tab1" hx-trigger="load delay:100ms" hx-target="#tabs" hx-swap="innerHTML"></div>
Example Code (Each Tab)
Subsequent tab pages display all tabs and highlight the selected one accordingly.

<div class="tab-list" role="tablist">
	<button hx-get="/tab1" class="selected" role="tab" aria-selected="true" aria-controls="tab-content">Tab 1</button>
	<button hx-get="/tab2" role="tab" aria-selected="false" aria-controls="tab-content">Tab 2</button>
	<button hx-get="/tab3" role="tab" aria-selected="false" aria-controls="tab-content">Tab 3</button>
</div>

<div id="tab-content" role="tabpanel" class="tab-content">
	Commodo normcore truffaut VHS duis gluten-free keffiyeh iPhone taxidermy godard ramps anim pour-over.
	Pitchfork vegan mollit umami quinoa aute aliquip kinfolk eiusmod live-edge cardigan ipsum locavore.
	Polaroid duis occaecat narwhal small batch food truck.
	PBR&B venmo shaman small batch you probably haven't heard of them hot chicken readymade.
	Enim tousled cliche woke, typewriter single-origin coffee hella culpa.
	Art party readymade 90's, asymmetrical hell of fingerstache ipsum.
</div>


```example
<div id="tabs" hx-target="this" hx-swap="innerHTML">
		<div class="tab-list" role="tablist">
			<button hx-get="/tab1" class="selected" role="tab" aria-selected="true" aria-controls="tab-content">Tab 1</button>
			<button hx-get="/tab2" role="tab" aria-selected="false" aria-controls="tab-content">Tab 2</button>
			<button hx-get="/tab3" role="tab" aria-selected="false" aria-controls="tab-content">Tab 3</button>
		</div>
		<div id="tab-content" role="tabpanel" class="tab-content">
			Commodo normcore truffaut VHS duis gluten-free keffiyeh iPhone taxidermy godard ramps anim pour-over.
			Pitchfork vegan mollit umami quinoa aute aliquip kinfolk eiusmod live-edge cardigan ipsum locavore.
			Polaroid duis occaecat narwhal small batch food truck.
			PBR&amp;B venmo shaman small batch you probably haven't heard of them hot chicken readymade.
			Enim tousled cliche woke, typewriter single-origin coffee hella culpa.
			Art party readymade 90's, asymmetrical hell of fingerstache ipsum.
		</div>
</div>
```