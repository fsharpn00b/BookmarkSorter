/* Copyright 2014 FSharpN00b.
This file is part of BookmarkSorter.

Bookmark Sorter is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Bookmark Sorter is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Bookmark Sorter.  If not, see <http://www.gnu.org/licenses/>. */

"use strict";

/* If the BookmarkSorter namespace is not defined, define it. */
if (typeof BookmarkSorter == "undefined") { var BookmarkSorter = {}; }

/* See:
https://developer.mozilla.org/en-US/docs/Components.utils.import
It seems the convention is that a .jsm module exports a variable with the same name as the module (for example, XPCOMUtils).
We use these modules and services at startup, so we import them with Components.utils.import and Components.classes instead of XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter. */
/* Firefox modules. */
Components.utils.import ("resource://gre/modules/XPCOMUtils.jsm");
/* BookmarkSorter modules. We import these into the BookmarkSorter namespace, instead of the default this namespace. */
Components.utils.import ("chrome://bookmarksorter/content/consts.jsm", BookmarkSorter);

/* Member values. */

/* The main window. */
var _window = null;

/* Functions: Initialization. */

/* See:
https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School/Handling_Preferences
https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School/Appendix_B:_Install_and_Uninstall_Scripts
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Toolbar
https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.addEventListener
*/
/* Handle the window load event. Return unit. */
function initialize () {
/* Find out whether this is the first time the add on has been loaded. */
    var firstRunPref = BookmarkSorter.Consts.preference_prefix + ".firstRun";
/* The get*Pref methods in nsiPrefBranch automatically check the current preferences and then the default preferences. */
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService (Components.interfaces.nsIPrefBranch);
/* If this is the first time the add on has been loaded... */
	if (prefs.getBoolPref (firstRunPref)) {
/* Get the navigation toolbar. */
		var toolbar = document.getElementById ("nav-bar");
/* Append our toolbar button to the end of the toolbar. */
		toolbar.insertItem("BookmarkSorter_button", null);
		toolbar.setAttribute ("currentset", toolbar.currentSet);
		document.persist (toolbar.id, "currentset");
/* Update the preference so this code does not run again. */
		prefs.setBoolPref (firstRunPref, false);
	}
}

/* Constructor. */

/* See:
https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School/Appendix_B:_Install_and_Uninstall_Scripts
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.addEventListener
*/
/* Handle the window load event. */
window.addEventListener ("load", function () { initialize (); }, false);

/* Methods. */
BookmarkSorter.Main = {

/* Methods called from overlay.xul, toolbar button. */
/* See:
https://developer.mozilla.org/en-US/docs/Web/API/window.open
http://stackoverflow.com/questions/10576481/appending-xul-elements-into-dom-from-a-string-of-markup
*/
    run : function () {
/* If the window has not been opened yet, or has been closed, open a new window. */
        if (_window === undefined || _window == null || _window.closed == true) {
            _window = BookmarkSorter.Consts.get_window ().open (BookmarkSorter.Consts.content_folder + "main_ui.xul", "", "centerscreen, chrome, resizable=yes");
        }
/* Focus the window. */
        _window.focus ();
    },

};
