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
XPCOMUtils.defineLazyServiceGetter (this, "Prompts", "@mozilla.org/embedcomp/prompt-service;1", Components.interfaces.nsIPromptService);

/* Member values. */

/* The keyboard shortcuts list box. */
var _keyboard_shortcuts_list = null;
/* The keyboard shortcuts. */
var _keyboard_shortcuts = null;

/* Functions: general helper. */

/* This is copied from main_ui.js and modified. */
/* Return the selected keys in list box (1). */
function get_selected_keys (list) {
    var keys = [];
/* Loop through the list box items. */
    for (var loop = 0; loop < list.itemCount; loop++) {
/* Get the list box item. */
        var item = list.getItemAtIndex (loop);
/* If the list box item is selected, add the value to the results. */
        if (item.selected == true) {
            keys.push (item.getAttribute ("value"));
        }
    }
    return keys;
}

/* This is copied from main_ui.js. */
/* Remove the items from listbox (1). Return unit. */
function clear_list_box (list) {
    while (list.itemCount > 0) { list.removeItemAt (0); }
}

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/listbox
*/
/* Add the keyboard shortcut with key (1) and tab group path (2) to the keyboard shortcuts list box. Return unit. */
function add_keyboard_shortcut_to_list (key, path) {
/* Create the list item and cells. */
    var list_item = document.createElement ("listitem");
    var key_cell = document.createElement ("listcell");
    var path_cell = document.createElement ("listcell");
/* Set the list item value to the key. It is easier to retrieve the key from there than from the key cell. */
    list_item.setAttribute ("value", key);
/* Set the cell values. */
    /* If the key is Space, set the label to that so the user can see it. */
    if (key == " ") { key_cell.setAttribute ("label", "Space"); }
    else { key_cell.setAttribute ("label", key); }
    path_cell.setAttribute ("label", path);
/* Add the cells to the list item. */
    list_item.appendChild (key_cell);
    list_item.appendChild (path_cell);
/* Add the list item to the list. */
    _keyboard_shortcuts_list.appendChild (list_item);
}

/* Add the keyboard shortcuts to the keyboard shortcut list box. Return unit. */
function add_keyboard_shortcuts_to_list () {
/* Clear the list box. */
    clear_list_box (_keyboard_shortcuts_list);
/* Loop through the keyboard shortcuts. */
    for (var key in _keyboard_shortcuts) {
/* Get the value for this key. */
        var value = _keyboard_shortcuts [key];
/* Add the key and tab group path to the list. */
        add_keyboard_shortcut_to_list (key, value.tab_group_path);
    }
}

/* Functions: event handler. */

/* Handle the user clicking Ok. Return true. */
function accept () {
/* If the user clicks Cancel, this function is never called, and window.arguments [0].out is null. */
    window.arguments [0].out = {
        keyboard_shortcuts : _keyboard_shortcuts,
    };
    return true;
}

/* Handle the user clicking the delete button. Return unit. */
function delete_click_handler () {
    var message = "Are you sure you want to delete the keyboard shortcuts?"
    var proceed = Prompts.confirm (window, "Confirm Delete Keyboard Shortcuts", message);
    if (proceed == true) {
/* Get the keys from the selected items in the keyboard shortcuts list. */
        var keys = get_selected_keys (_keyboard_shortcuts_list);
/* Loop through the keys. */
        for (var loop = 0; loop < keys.length; loop++) {
/* Delete the entry for this key in the keyboard shortcuts. */
            delete _keyboard_shortcuts [keys [loop]];
        }
    }
/* Update the keyboard shortcuts list. */
    add_keyboard_shortcuts_to_list ();
}

/* Handle the user clicking the delete all button. Return unit. */
function delete_all_click_handler () {
    var message = "Are you sure you want to delete all keyboard shortcuts?"
    var proceed = Prompts.confirm (window, "Confirm Delete Keyboard Shortcuts", message);
    if (proceed == true) {
/* Clear the keyboard shortcuts. */
        _keyboard_shortcuts = {};
/* Close the dialog. */
        var dialog = document.getElementById ("BookmarkSorter_view_hotkeys");
        dialog.acceptDialog ();
    }
}

/* Handle the window load event. Return unit. */
function load_handler () {
/* Get the keyboard shortcuts. */
    _keyboard_shortcuts = window.arguments [0].inn;
/* Get the list box. */
    _keyboard_shortcuts_list = document.getElementById ("keyboard_shortcuts");
/* Add the keyboard shortcuts to the list box. */
    add_keyboard_shortcuts_to_list ();
}
