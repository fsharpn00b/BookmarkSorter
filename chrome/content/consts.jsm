/* Copyright 2014 FSharpN00b.
This file is part of BookmarkSorter.

BookmarkSorter is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

BookmarkSorter is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with BookmarkSorter.  If not, see <http://www.gnu.org/licenses/>. */

"use strict";

/* See:
https://developer.mozilla.org/en-US/docs/Components.utils.import
It seems the convention is that a .jsm module exports a variable with the same name as the module (for example, XPCOMUtils).
We use these modules and services at startup, so we import them with Components.utils.import and Components.classes instead of XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter. */
/* Firefox modules. */
Components.utils.import ("resource://gre/modules/XPCOMUtils.jsm");

/* See:
https://developer.mozilla.org/en-US/Add-ons/Performance_best_practices_in_extensions
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/XPCOMUtils.jsm
We don't use these modules and services at startup, so we import them with XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter instead of Components.utils.import and Components.classes.
Note the name parameter must match an exported symbol from the module.
*/
/* Firefox services. */
XPCOMUtils.defineLazyServiceGetter (this, "WM", "@mozilla.org/appshell/window-mediator;1", Components.interfaces.nsIWindowMediator);
/* Firefox modules. */
XPCOMUtils.defineLazyModuleGetter (this, "Services", "resource://gre/modules/Services.jsm");

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Using
*/
var EXPORTED_SYMBOLS = ["Consts"];

/* It seems an object field cannot refer to another, so we declare these here so we can refer to them in the Consts object. */
const addon_id = "{4966CF83-C4AF-4606-80FE-0BAA4552317B}";
/* True to run in debug mode; otherwise, false. */
const isDebug = false;

const addon_name = "Bookmark Sorter";
const preference_prefix = "extensions." + addon_id;
const content_folder = "chrome://bookmarksorter/content/";

var Consts = {
    addon_name : addon_name,
	addon_id : addon_id,
	preference_prefix : preference_prefix,
	content_folder : content_folder,

/* Functions: general helper. */

/* Return the value for the preference with type int and name (1). */
    get_int_pref : function (name) {
        return Services.prefs.getIntPref (preference_prefix + "." + name);
    },

/* Return the value for the preference with type bool and name (1). */
    get_bool_pref : function (name) {
        return Services.prefs.getBoolPref (preference_prefix + "." + name);
    },

/* Set preference with type int and name (1) to value (2). Return unit. */
    set_int_pref : function (name, value) {
        Services.prefs.setIntPref (preference_prefix + "." + name, value);
    },

/* Set preference with type bool and name (1) to value (2). Return unit. */
    set_bool_pref : function (name, value) {
        Services.prefs.setBoolPref (preference_prefix + "." + name, value);
    },

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWindowMediator
*/
/* Return the most recent browser window. */
	get_window : function () {
/* The documentation does not list any exceptions for WM.getMostRecentWindow. */
		var window = WM.getMostRecentWindow ("navigator:browser");
/* We do not intend this add on to run with no window open. So we raise an exception if that happens. */
		if (window != null) { return window; }
		else { throw new Error ("WindowMediator.getMostRecentWindow returned None."); }
	},

/* Note this add on uses a custom window that is not a browser window. To show an alert, we need to use the custom window, not the browser window. Otherwise, because the browser window is usually behind the custom window, the alert is also hidden behind the custom window. */
/* Return the most recent window of any type. */
    get_any_window : function () {
/* The documentation does not list any exceptions for WM.getMostRecentWindow. */
		return WM.getMostRecentWindow (null);
    },

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWindowMediator
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsISimpleEnumerator
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Tabbed_browser
*/
/* Return all browser windows. */
	get_windows : function () {
		var windows = [];
/* The documentation does not list any exceptions for WM.getEnumerator, nsISimpleEnumerator.hasMoreElements, or nsISimpleEnumerator.getNext. */
/* Get all browser windows and loop through them. */
		var enumerator = WM.getEnumerator ("navigator:browser");
		while (enumerator.hasMoreElements () == true) { windows.push (enumerator.getNext ()); }
/* We do not intend this add on to run with no window open. So we raise an exception if that happens. */
		if (windows.length > 0) { return windows; }
		else { throw new Error ("WindowMediator.getEnumerator found no open windows."); }
	},

/* Log message (1). Return unit. */
	log : function (message) {
		Consts.get_window ().console.log (addon_name + ": " + message);
	},

/* Log object (1). Return unit. */
	log_obj : function (obj) {
		Consts.get_window ().console.log (addon_name + ": " + JSON.stringify (obj));
	},

/* See:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
*/
/* Show error (1). Return unit. */
	show_error : function (error) {
		var message = addon_name + " error: " + error.message;
		if (error.fileName !== undefined) { message += "\nFile: " + error.fileName; }
		if (error.lineNumber !== undefined) { message += "\nLine: " + error.lineNumber; }
/* If we are in debug mode, log the error to the console. Otherwise, show it in an alert. */
		if (isDebug == true) { Consts.get_window ().console.log (message); }
/* Previously, we called get_any_window, but it does not work here. */
		else { Consts.get_window ().alert (message); }
	},

/* This is used for debugging, so we do not call it in show_error. */
/* See:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack
*/
/* Return the call stack. */
	get_call_stack : function () {
		try { throw new Error (addon_name + ": this error was thrown to get the call stack."); }
		catch (e) { return e.stack; }
	},

/* Sleep for (1) milliseconds. Return unit. */
	sleep : function (ms) {
		var currentTime = new Date().getTime();
		while (currentTime + ms >= new Date().getTime()) {}
	},
};
