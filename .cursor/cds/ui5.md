

example:
```
import employeeIcon from '@ui5/webcomponents-icons/dist/employee.js';
import { Avatar, ShellBar } from '@ui5/webcomponents-react';

export default function Page() {
  return (
    <>
      <ShellBar
        logo={
          <img
            src="https://raw.githubusercontent.com/UI5/webcomponents-react/main/assets/ui5-logo.svg"
            alt={'UI5 Web Components for React logo'}
          />
        }
        primaryTitle="UI5 Web Components for React Template"
        profile={<Avatar icon={employeeIcon} />}
      />
      {/* Add your code here */}
    </>
  );
}

```import { ThemeProvider } from '@ui5/webcomponents-react';


add

    <html lang="en">
      <head>
        <script
          data-ui5-config
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              theme: 'sap_horizon',
            }),
          }}
        />
        <script src="https://esm.sh/@ui5/webcomponents-react/dist/Assets">
      </head>
      <body>
        <div className="appShell">
          <ThemeProvider staticCssInjected>{children}</ThemeProvider>
        </div>
      </body>
    </html>


------

SAP Logo with Text 'The Best Run'
© Copyright 2025, SAP SE and UI5 Web Components for React Contributors
 
|
 
Terms of Use
 
|
 
Legal Disclosure
 
|
 
Trademarks
UI5 Web Components for React
      

Open Github Project

UI5 Web Components for React is a Fiori compliant React library built on top of the UI5 Web Components. With the help of UI5 Web Components for React, you can use UI5 Web Components as if they were native React components. In addition to that, UI5 Web Components for React is providing complex components and layouts on top of the UI5 Web Components.

Requirements
End of Support for Version 1.x
Getting Started
Tutorial
Examples & Templates
Download and Installation
Recommended Installation
Minimal Installation
Version Alignment & Package Mapping
Using UI5 Web Components for React
Theming
Configure Compact/Cozy setting
TypeScript
Example
Feature Registration
Support
Requirements
React and React-DOM (18.0.0 or higher)
Node.js (LTS version)
If you're using TypeScript we recommend version 4.7 or later.
End of Support for Version 1.x
The support for version 1.x of ui5-webcomponents-react has ended on July 1, 2025. We recommend migrating to version 2.x as soon as possible. For more information, please refer to our Migration Guide.

Getting Started
Tutorial
You are new to UI5 Web Components for React and don't know where to start?
Then take a look at our Tutorial Mission at “SAP Developers”! There you get a first glimpse at how easy it is to create an Application with UI5 Web Components for React.
In about an hour you will create a business dashboard from scratch and get familiar with some React basics in case you don't know them already.

Examples & Templates
You can find a curated list of project templates and examples on our Project Templates & Examples page.

Download and Installation
You can install @ui5/webcomponents-react along with the required peer-dependencies based on the components you plan to use. In most cases, the recommended installation is the most maintainable option.

Recommended Installation
Install @ui5/webcomponents-react along with the @ui5/webcomponents and @ui5/webcomponents-fiori peer-dependencies as dependencies in your project:

npm install @ui5/webcomponents-react @ui5/webcomponents @ui5/webcomponents-fiori
Copy
Note: If you import anything from another @ui5/webcomponents-xyz package, we recommend installing it as a dependency as well, even if it’s already included through another package.

Minimal Installation
Since version v2.14.0 of @ui5/webcomponents-react, @ui5/webcomponents-fiori is an optional peer-dependency. You will still need to install it if:

You want to use any component from the @ui5/webcomponents-fiori package.
You want to use the VariantManagement component.
You import anything from the @ui5/webcomponents-fiori package.
npm install @ui5/webcomponents-react @ui5/webcomponents
Copy
Note: Most popular bundlers enable tree-shaking for production builds, so there’s no difference in the final bundle size between the recommended and minimal installations.

⚠️ Warning

If your bundler does not support tree-shaking, you must use subpath imports.

Otherwise, since @ui5/webcomponents-react re-exports all components, every component (including those that depend on the @ui5/webcomponents-fiori package) will be included in your bundle, which will lead to errors due to the missing module.

✅ Do:

import { Button } from '@ui5/webcomponents-react/Button';
Copy
❌ Don’t:

import { Button } from '@ui5/webcomponents-react';
Copy
Importing Assets
The default assets import (import '@ui5/webcomponents-react/dist/Assets.js';) includes assets from the fiori package. Due to a limitation of Next.js (top-level await is not supported), we can't dynamically import the assets based on the installed packages. If you are using the minimal installation, please import the assets manually as follows:

import '@ui5/webcomponents/dist/Assets.js';
import '@ui5/webcomponents-react/dist/json-imports/i18n.js';

//fetch
import '@ui5/webcomponents/dist/Assets-fetch.js';
import '@ui5/webcomponents-react/dist/json-imports/i18n-fetch.js';

//node
import '@ui5/webcomponents/dist/Assets-node.js';
import '@ui5/webcomponents-react/dist/json-imports/i18n-node.js';
Copy
Version Alignment & Package Mapping
Starting with version 2.4.0 of @ui5/webcomponents-react, all packages now align their minor version with @ui5/webcomponents!
In order to allow patching releases of UI5 Web Components by yourself, packages from 
ui5-webcomponents
 are peer dependencies of 
ui5-webcomponents-react
 packages.

If you're not clear which package is developed in which repo, expand the table below.

Show Package to Repository Mapping
ui5-webcomponents-react
 Versions	
ui5-webcomponents
 Versions
Version 1
Version 2
~2.0.0	~2.1.2
~2.1.0	~2.2.0
~2.2.0, ~2.3.0	~2.3.0
~2.4.0	~2.4.0
~2.5.0	~2.5.0
~2.6.2	~2.6.0
~2.7.0	~2.7.0
~2.8.0	~2.8.0
~2.9.0	~2.9.0
~2.10.0	~2.10.0
~2.11.0	~2.11.0
~2.12.0	~2.12.0
~2.13.0	~2.13.1
~2.14.0	~2.14.0
~2.15.0	~2.15.0
~2.16.0	~2.16.1
Please note that if a version doesn't start with a patch-version of 0 (e.g. ~1.10.3), only the specified version is supported and the previous patch-versions will most likely not work with @ui5/webcomponents-react.
Using UI5 Web Components for React
In order to use @ui5/webcomponents-react you have to wrap your application's root component into the ThemeProvider component.

import { ThemeProvider } from '@ui5/webcomponents-react/ThemeProvider';
...
createRoot(document.getElementById('root') as HTMLElement).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
Copy
Then you are ready to use @ui5/webcomponents-react and you can import the desired component(s) in your app. For example, to use the Button component you need to import it:

import { Button } from '@ui5/webcomponents-react/Button'; // loads ui5-button wrapped in a ui5-webcomponents-react component
Copy
Then, you can use the Button in your app:

<Button onClick={() => alert('Hello World!')}>Hello world!</Button>
Copy
Theming
UI5 Web Components and UI5 Web Components for React are both coming with the sap_fiori_3 a.k.a. Quartz and sap_horizon Theme families built in.

UI5 Web Components for React uses the theme configuration of UI5 Web Components. Please also have a look at their 
documentation
.
In case you want to change your applications' theme, you have to import a couple of modules:

import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme';
import '@ui5/webcomponents-react/dist/Assets';
Copy
You can now change the Theme by calling setTheme with a string parameter of the new theme.
Available Themes:

sap_horizon (default)

sap_horizon_dark

sap_horizon_hcb

sap_horizon_hcw

sap_fiori_3

sap_fiori_3_dark

sap_fiori_3_hcb

sap_fiori_3_hcw

Configure Compact/Cozy setting
UI5 Web Components supports Compact and Cozy mode. It is set to Cozy by default. To enable Compact, provide the css class ui5-content-density-compact to any of your HTML elements and it apply compact size to all of its children.

<body class="ui5-content-density-compact">
  ...
</body>
Copy
TypeScript
UI5 Web Components for React supports TypeScript, therefore we also provide type interfaces for event parameters, public methods of ui5-webcomponents, and more.

You can find all available interfaces of the main package here and for charts here.

Example
Small app with a popover opened by clicking a button including type declarations:

import { useState, useRef } from 'react';
import type { ButtonPropTypes } from '@ui5/webcomponents-react/Button';
import type { PopoverDomRef, PopoverPropTypes } from '@ui5/webcomponents-react/Popover';
import { ThemeProvider } from '@ui5/webcomponents-react/ThemeProvider';
import { Button } from '@ui5/webcomponents-react/Button';
import { Popover } from '@ui5/webcomponents-react/Popover';

export default function App() {
  const [open, setOpen] = useState<PopoverPropTypes['open']>(false);
  const popoverRef = useRef<PopoverDomRef>(null);

  const handleClick: ButtonPropTypes['onClick'] = (e) => {
    setOpen(true);
  };
  const handleAfterClose: PopoverPropTypes['onClose'] = (e) => {
    setOpen(false);
  };

  return (
    <ThemeProvider>
      <Button id="opener" onClick={handleClick}>
        Open Popover
      </Button>
      <Popover ref={popoverRef} opener="opener" open={open} onClose={handleAfterClose}>
        Content
      </Popover>
    </ThemeProvider>
  );
}
Copy
Feature Registration
@ui5/webcomponents offers a variety of feature (side-effect) imports that are available with @ui5/webcomponents-react as well. To use them you have to make sure they are imported before any other imports!

Support
Feel free to open issues or ask us directly in the #webcomponents-react channel in the OpenUI5 Community Slack.
Please note that you have to join this slack workspace via this link if you are not part of it already.
----
ssr

SAP Logo with Text 'The Best Run'
© Copyright 2025, SAP SE and UI5 Web Components for React Contributors
 
|
 
Terms of Use
 
|
 
Legal Disclosure
 
|
 
Trademarks
Next.js
Create a new project
Add to existing project
Common Pitfalls
Icon and Feature Imports in Server Components
Other frameworks
Server Side Rendering
We're happy to announce that starting from v1.17.0, UI5 Web Components for React is supporting Server Side Rendering Frameworks like Next.js 🎉.

Known Limitations
As custom elements need to be defined on the client, UI5 Web Components for React is only rendering the outer markup of the UI5 Web Component on the server. The rendering of the Web Component is still happening on the client.
The Next.js app directory shows some hydration warnings on the client. These warnings seem not to affect the runtime.


Next.js
Create a new project
The best way to start using UI5 Web Components in Next.js is using one of our templates. We have templates available for both the pages and the app router.

Add to existing project
In case you already have an existing Next.js project and want to add UI5 Web Components for React to it, you first need to follow our general Getting Started Guide.

For better SSR support (i.a. to prevent flickering), we recommend importing our stylesheet bundle inside the _app file or the root layout (depending on whether you are using the pages or the app router) and set the staticCssInjected prop on our ThemeProvider:

Note: Only import the stylesheets of the packages you are actually using.

import '@ui5/webcomponents-react/styles.css'; // main package styles
// Required only when using the corresponding package
import '@ui5/webcomponents-react-charts/styles.css'; // chart package styles
import '@ui5/webcomponents-react-compat/styles.css'; // compat package styles


export default function AppOrRootLayout() {
  // ...
  return (
    // ...
    <ThemeProvider staticCssInjected>{/* your app content */}</ThemeProvider>
  );
}
Copy
Common Pitfalls
Icon and Feature Imports in Server Components
Some UI5 Web Component features rely on the registration of a component during runtime on the client. The most common of these are icon imports (e.g. import '@ui5/webcomponents-icons/dist/add.js';), feature imports (e.g. import '@ui5/webcomponents/dist/features/FormSupport.js'; and asset imports (e.g. import '@ui5/webcomponents-react/dist/Assets.js';).

In order to fulfill their purpose in your application, you must ensure that these imports are only used in client components (the file or a parent component must contain the 'use client'; directive). If they are imported into server components, these imports will do nothing and you'll notice that some features or icons are not available in your application.

Other frameworks
Your favorite framework is missing here? Feel free to edit this page and submit a pull request to get it added!