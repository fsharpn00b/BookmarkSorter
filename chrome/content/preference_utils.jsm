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

/* If the BookmarkSorter namespace is not defined, define it. */
if (typeof BookmarkSorter == "undefined") { var BookmarkSorter = {}; }

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Using
*/
var EXPORTED_SYMBOLS = ["PreferenceUtils"];

/* See:
https://developer.mozilla.org/en-US/docs/Components.utils.import
It seems the convention is that a .jsm module exports a variable with the same name as the module (for example, XPCOMUtils).
We use these modules and services at startup, so we import them with Components.utils.import and Components.classes instead of XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter. */
/* Firefox modules. */
Components.utils.import ("resource://gre/modules/XPCOMUtils.jsm");
/* BookmarkSorter modules. We import these into the BookmarkSorter namespace, instead of the default this namespace. */
Components.utils.import ("chrome://bookmarksorter/content/consts.jsm", BookmarkSorter);

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/mozIJSSubScriptLoader
*/
var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
	.getService(Components.interfaces.mozIJSSubScriptLoader);
/* Include sprintf. */
scriptLoader.loadSubScript (BookmarkSorter.Consts.content_folder + "sprintf.min.js");
/* Include Underscore. */
scriptLoader.loadSubScript (BookmarkSorter.Consts.content_folder + "underscore-min.js");

/* See:
https://developer.mozilla.org/en-US/Add-ons/Performance_best_practices_in_extensions
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/XPCOMUtils.jsm
We don't use these modules and services at startup, so we import them with XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter instead of Components.utils.import and Components.classes.
Note the name parameter must match an exported symbol from the module.
*/
/* Firefox modules. */
XPCOMUtils.defineLazyModuleGetter (this, "Services", "resource://gre/modules/Services.jsm");

/* Member values. */

/* The main window. */
var _window = null;
/* The rules in the stylesheet for the main window. */
var _css_rules = [];

/* The CSS rule for a label. */
var _label_rule_index = 0;
/* The CSS rule for a textbox. */
var _text_box_rule_index = 1;
/* The CSS rule for a checkbox. */
var _checkbox_rule_index = 2;
/* The CSS rule for a list item. */
var _list_item_rule_index = 3;
/* The CSS rule for a selected list item. */
var _list_item_selected_rule_index = 4;
/* The CSS rule for a menu item. */
var _menu_item_rule_index = 5;
/* The CSS rule for a menu item the user hovers over. */
var _menu_item_hover_rule_index = 6;
/* The CSS rule for a selected menu item. */
var _menu_item_selected_rule_index = 7;
/* The CSS rule for a menu list label. */
var _menu_list_label_rule_index = 8;
/* The CSS rule for a tree. */
var _tree_rule_index = 9;
/* The CSS rule for a treechildren element. */
var _tree_children_rule_index = 10;
/* The CSS rule for a tree row. */
var _tree_row_rule_index = 11;
/* The CSS rule for a tree row the user hovers over. */
var _tree_row_hover_rule_index = 12;
/* The CSS rule for a selected tree row. */
var _tree_row_selected_index = 13;
/* The CSS rule for a selected tree row that the user hovers over. */
var _tree_row_hover_selected_rule_index = 14;
/* The CSS rule for a tree cell of type text. */
var _tree_cell_text_index = 15;
/* The CSS rule for a tree cell of type text the user hovers over. */
var _tree_cell_text_hover_index = 16;
/* The CSS rule for a selected tree cell of type text. */
var _tree_cell_text_selected_index = 17;
/* The CSS rule for a selected tree cell of type text that the user hovers over. */
var _tree_cell_text_hover_selected_index = 18;

/* The preference name for the font size. */
var _font_size_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".font_size";
/* The preference name for the default background color. */
var _default_background_color_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".default_background_color";
/* The preference name for the default text color. */
var _default_foreground_color_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".default_foreground_color";
/* The preference name for the background color for items the user hovers over. */
var _hover_background_color_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".hover_background_color";
/* The preference name for the text color for items the user hovers over. */
var _hover_foreground_color_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".hover_foreground_color";
/* The preference name for the background color for selected items. */
var _selected_background_color_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".selected_background_color";
/* The preference name for the text color for selected items. */
var _selected_foreground_color_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".selected_foreground_color";
/* The preference for whether to log moved tabs. */
var _log_moved_tabs_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".log_moved_tabs";
/* The preference for the folder where rulesets are saved. */
var _ruleset_folder_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".ruleset_folder";
/* The preference for the user's keyboard shortcuts. */
var _keyboard_shortcuts_pref_name = "extensions." + BookmarkSorter.Consts.addon_id + ".keyboard_shortcuts";

/* Functions: helper: preferences. */

/* Return the preference name (1) with the preference prefix prepended to it. */
function add_preference_prefix (name) {
    return sprintf ("%s.%s", BookmarkSorter.Consts.preference_prefix, name);
}

/* Return the value for the preference with type string and name (1). */
function get_string_pref (name) {
    var value = Services.prefs.getComplexValue (name, Components.interfaces.nsISupportsString);
    return value.data;
}

/* Set the preference with type string and name (1) to have value (2). Return unit. */
function set_string_pref (name, value) {
	var value_ = Components.classes["@mozilla.org/supports-string;1"]
		.createInstance(Components.interfaces.nsISupportsString);
	value_.data = value;
	Services.prefs.setComplexValue (name, Components.interfaces.nsISupportsString, value_);
}

/* Return the value for the preference with name (1). */
function get_pref_value (pref_name) {
    var value = null;
    var pref_type = Services.prefs.getPrefType (pref_name);
    switch (pref_type) {
        case Components.interfaces.nsIPrefBranch.PREF_STRING:
            value = get_string_pref (pref_name);
            break;
        case Components.interfaces.nsIPrefBranch.PREF_INT:
            value = Services.prefs.getIntPref (pref_name);
            break;
        case Components.interfaces.nsIPrefBranch.PREF_BOOL:
            value = Services.prefs.getBoolPref (pref_name);
            break;
        default:
            throw new Error (sprintf ("preference_utils.jsm: get_pref_value: Unrecognized preference type. Preference name: %s. Preference type: %d.", pref_name, pref_type));
            break;
    };
    return value;
}

/* Functions: event handler helper: preferences. */

/* Set the user interface to use font size (1). Return unit. */
function set_font_size (value) {
    var value_ = sprintf ("%dpx", value);
    _css_rules [_label_rule_index].style.fontSize = value_;
    _css_rules [_text_box_rule_index].style.fontSize = value_;
    _css_rules [_checkbox_rule_index].style.fontSize = value_;
/* It seems we can set the font size property on listitem and have it apply to listitem[selected] as well. */
    _css_rules [_list_item_rule_index].style.fontSize = value_;
    _css_rules [_menu_item_rule_index].style.fontSize = value_;
    _css_rules [_tree_rule_index].style.fontSize = value_;
}

/* Set the user interface to use default background color (1). Return unit. */
function set_default_background_color (value) {
    _css_rules [_text_box_rule_index].style.backgroundColor = value;
    _css_rules [_list_item_rule_index].style.backgroundColor = value;
    _css_rules [_menu_item_rule_index].style.backgroundColor = value;
    _css_rules [_menu_list_label_rule_index].style.backgroundColor = value;
    _css_rules [_tree_children_rule_index].style.backgroundColor = value;
}

/* Set the user interface to use default foreground color (1). Return unit. */
function set_default_foreground_color (value) {
    _css_rules [_text_box_rule_index].style.color = value;
    _css_rules [_list_item_rule_index].style.color = value;
    _css_rules [_menu_item_rule_index].style.color = value;
    _css_rules [_menu_list_label_rule_index].style.color = value;
    _css_rules [_tree_cell_text_index].style.color = value;
}

/* Set the user interface to use background color (1) for items the user hovers over. Return unit. */
function set_hover_background_color (value) {
/* See:
https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration
*/
/* For some reason, this does not work unless we use important. */
    _css_rules [_menu_item_hover_rule_index].style.setProperty ("background-color", value, "important");
/* For some reason, this does not work unless we use important. */
    _css_rules [_tree_row_hover_rule_index].style.setProperty ("background-color", value, "important");
/* When the user hovers over a selected item, we want it to have the hover background color. */
    _css_rules [_tree_row_hover_selected_rule_index].style.backgroundColor = value;
}

/* Set the user interface to use foreground color (1) for items the user hovers over. Return unit. */
function set_hover_foreground_color (value) {
/* For some reason, this does not work unless we use important. */
    _css_rules [_menu_item_hover_rule_index].style.setProperty ("color", value, "important");
/* For some reason, this does not work unless we use important. */
    _css_rules [_tree_cell_text_hover_index].style.setProperty ("color", value, "important");
}

/* Set the user interface to use background color (1) for selected items. Return unit. */
function set_selected_background_color (value) {
    _css_rules [_list_item_selected_rule_index].style.backgroundColor = value;
    _css_rules [_menu_item_selected_rule_index].style.backgroundColor = value;
/* For some reason, this does not work unless we use important. */
    _css_rules [_tree_row_selected_index].style.setProperty ("background-color", value, "important");
}

/* Set the user interface to use foreground color (1) for selected items. Return unit. */
function set_selected_foreground_color (value) {
    _css_rules [_list_item_selected_rule_index].style.color = value;
    _css_rules [_menu_item_selected_rule_index].style.color = value;
    _css_rules [_tree_cell_text_selected_index].style.color = value;
/* When the user hovers over a selected item, we want it to have the selection foreground color. */
    _css_rules [_tree_cell_text_hover_selected_index].style.color = value;
}

/* Event handler for preference changes. (1) The preference name. (2) The new value. */
function handle_pref_change (pref_name, value) {
    switch (pref_name) {
        case _font_size_pref_name:
            set_font_size (value);
            break;
        case _default_background_color_pref_name:
            set_default_background_color (value);
            break;
        case _default_foreground_color_pref_name:
            set_default_foreground_color (value);
            break;
        case _hover_background_color_pref_name:
            set_hover_background_color (value);
            break;
        case _hover_foreground_color_pref_name:
            set_hover_foreground_color (value);
            break;
        case _selected_background_color_pref_name:
            set_selected_background_color (value);
            break;
        case _selected_foreground_color_pref_name:
            set_selected_foreground_color (value);
            break;
        default:
            break;
    };
}

/* Update the user interface based on preferences. Return unit. */
function init_prefs () {
    set_font_size (get_pref_value (_font_size_pref_name));
    set_default_background_color (get_pref_value (_default_background_color_pref_name));
    set_default_foreground_color (get_pref_value (_default_foreground_color_pref_name));
    set_hover_background_color (get_pref_value (_hover_background_color_pref_name));
    set_hover_foreground_color (get_pref_value (_hover_foreground_color_pref_name));
    set_selected_background_color (get_pref_value (_selected_background_color_pref_name));
    set_selected_foreground_color (get_pref_value (_selected_foreground_color_pref_name));
}

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPrefBranch
https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School/Handling_Preferences
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Preferences
*/
/* Observes preference changes. */
var _preference_observer = {
/* Start observing preference changes. Return unit. */
    add_observer : function () {
/* (3) True to hold a weak reference to the observer; false to hold a strong reference. */
        Services.prefs.addObserver (_font_size_pref_name, this, false);
        Services.prefs.addObserver (_default_background_color_pref_name, this, false);
        Services.prefs.addObserver (_default_foreground_color_pref_name, this, false);
        Services.prefs.addObserver (_hover_background_color_pref_name, this, false);
        Services.prefs.addObserver (_hover_foreground_color_pref_name, this, false);
        Services.prefs.addObserver (_selected_background_color_pref_name, this, false);
        Services.prefs.addObserver (_selected_foreground_color_pref_name, this, false);
    },
/* Stop observing preference changes. Return unit. */
    remove_observer : function () {
        Services.prefs.removeObserver (_font_size_pref_name, this);
        Services.prefs.removeObserver (_default_background_color_pref_name, this);
        Services.prefs.removeObserver (_default_foreground_color_pref_name, this);
        Services.prefs.removeObserver (_hover_background_color_pref_name, this);
        Services.prefs.removeObserver (_hover_foreground_color_pref_name, this);
        Services.prefs.removeObserver (_selected_background_color_pref_name, this);
        Services.prefs.removeObserver (_selected_foreground_color_pref_name, this);
    },
/* Event handler for preference changes. (1) The preference branch that contains the preference that changed. (2) The event message. (3) The name of the preference that changed. */
    observe : function (aSubject, aTopic, aData) {
        if ("nsPref:changed" == aTopic) {
/* Handle the preference change. */
            handle_pref_change (aData, get_pref_value (aData));
        }
    },
};

/* See:
https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Using_dynamic_styling_information
*/
/* Handle the window load event. Return unit. */
function load_handler_helper (window) {
    _window = window;
/* See main_ui.xul. The second style sheet is main_ui.css. */
    _css_rules = _window.document.styleSheets [1].cssRules;
/* Update the user interface based on preferences. */
    init_prefs ();
/* Start observing preference changes. */
    _preference_observer.add_observer ();
}

/* Handle the window unload event. Return unit. */
function unload_handler_helper () {
/* Stop observing preference changes. */
    _preference_observer.remove_observer ();
}

/* Functions: methods. */

var PreferenceUtils = {
/* Handle the window load event. Return unit. */
    load_handler : load_handler_helper,
/* Handle the window unload event. Return unit. */
    unload_handler : unload_handler_helper,
/* Return the value of the preference for whether to log moved tabs. */
    get_log_moved_tabs_pref_value : function () {
        return get_pref_value (_log_moved_tabs_pref_name);
    },
/* Return the value of the preference for the folder where rulesets are stored. */
    get_ruleset_folder_pref_value : function () {
        return get_pref_value (_ruleset_folder_pref_name);
    },
/* Set the preference for the folder where rulesets are stored to value (1). Return unit. */
    set_ruleset_folder_pref_value : function (value) {
        set_string_pref (_ruleset_folder_pref_name, value);
    },
/* Return the value of the preference for the user's keyboard shortcuts. */
    get_keyboard_shortcuts_pref_value : function () {
        return get_pref_value (_keyboard_shortcuts_pref_name);
    },
/* Set the preference for the user's keyboard shortcuts to value (1). Return unit. */
    set_keyboard_shortcuts_pref_value : function (value) {
        set_string_pref (_keyboard_shortcuts_pref_name, value);
    }
};