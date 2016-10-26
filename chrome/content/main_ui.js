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
/* Firefox services. */
XPCOMUtils.defineLazyServiceGetter (this, "Bookmarks", "@mozilla.org/browser/nav-bookmarks-service;1", Components.interfaces.nsINavBookmarksService);
XPCOMUtils.defineLazyServiceGetter (this, "Prompts", "@mozilla.org/embedcomp/prompt-service;1", Components.interfaces.nsIPromptService);
/* BookmarkSorter modules. We import these into the BookmarkSorter namespace, instead of the default this namespace. */
XPCOMUtils.defineLazyModuleGetter (BookmarkSorter, "BookmarkUtils", BookmarkSorter.Consts.content_folder + "bookmark_utils.jsm");
XPCOMUtils.defineLazyModuleGetter (BookmarkSorter, "File", BookmarkSorter.Consts.content_folder + "file.jsm");
XPCOMUtils.defineLazyModuleGetter (BookmarkSorter, "PreferenceUtils", BookmarkSorter.Consts.content_folder + "preference_utils.jsm");

// TODO1 Look at all messages and make sure we don't specify bookmark folder or tab group, tab group ID, etc. Or put notes on all of them that we will need to expand them if we include tab groups.

/* TODO1 Work items.
- Move buttons so we can still see them after collapsing right pane
- Make tabs sortable by title or destination (or URL - but we'd need to add a column)
- Remember in prefs what columns are shown in trees.

- If you mouse over the destination column in the rule tree, tooltip should be the full destination path.
- If the tab title is not fully visible due to column width, tooltip shows the title instead of the URL. Fix. Probably need to mark the event handled and maybe intercept it at an earlier point.  Maybe show both the title and URL in the tooltip.
- Make hiding panes less clunky.
- Add context menu to rule tree to set rules to regex/ignore case.
- Add regex/ignore case to the save rule confirmation dialog.
- Are columns sortable? It seems not. Do we ever look up tab objects by their indices in _tabs instead of by tab ID? No, we always use tab_id_to_tab. We should make columns sortable anyway.
- Make the bookmark folder a tree instead of a list.
- Make tab tree context menu MRU.
- Add unit tests.
- Let the user add new bookmark folders or session tab groups? Make the menu lists editable? Or make it a drop down option that opens a prompt?
- Display and allow the user to move tabs to/from session tab groups as well. session_utils.jsm functions might need to return tabs that include the full entry JSON object. We also need to find out the API for assigning tabs from one session tab group to another. See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsISessionStore (getTabState)
- We might also be able to merge multiple sessions and save them as a .session file rather than exporting them to bookmarks or HTML, which is a feature we wanted to add to Session Exporter.
- Add a note to users that they should not modify tab groups while this is running, because we do not track those changes.
*/

/* TODO1 Highlight work items.
- Highlight tabs that match selected rules.
- Highlight rules that match selected bookmarks. We should be able to do that as follows:
var rules = get_rules_from_tree ();
match_rules_to_tab (tab, rules);
get_rule_action returns the rule index, so we can easily set a custom property on that row in the rule tree.
- Highlight bookmarks that have destination set manually (currently we use a column).
- Highlight bookmarks that have had destination set by rules? Or those that have not been set? Both could be preferences.
*/

/* Note we tried renaming the rule field of the rule object to rule_text, but that breaks compatibility with existing saved rulesets. */

/* Note.
A rule can have an deleted destination tab group in the following ways.
1.
a. The user creates a rule.
b. The user deletes the bookmark folder that is the destination for the rule.
We handle this case as follows. We detect when the user deletes a bookmark folder. We reload the tab groups list, the tab destination tab group list, the rule destination tab group list, and the tab tree context menu. This prevents the user from setting a tab or a rule to have a deleted destination. We also set all rules that have the deleted bookmark folder as a destination to have an invalid destination instead. apply_rules_to_tabs and its helpers ignore rules that have invalid destinations. So they cannot set a tab to have a deleted or invalid destination. See:
bookmark_folder_removed_handler > update_rules_deleted_tab_group
apply_rules_to_tabs > apply_rules_to_tab > match_rules_to_tab > match_rule_to_tab

2.
a. The user creates a rule.
b. The user saves the ruleset.
c. The user closes Bookmark Sorter.
d. The user deletes the bookmark folder that is the destination for the rule.
e. The user opens Bookmark Sorter.
f. The user loads the ruleset.
We handle this case as follows. When the user loads a ruleset, if it contains a rule that has a deleted bookmark folder as a destination, we set the rule to have an invalid destination instead. See:
load_ruleset_click_handler_helper > load_ruleset > add_rules_to_tree > add_rule_to_tree
*/

/* Member values. */

/* The tab group selection list box. */
var _tab_groups_list = null;
/* The tab search text box. */
var _tab_search_text = null;
/* The checkbox for whether the tab search text is a regex. */
var _tab_search_is_regex = null;
/* The checkbox for whether the tab search should match case. */
var _tab_search_match_case = null;
/* The checkbox for whether the tab search should match the tab title. */
var _tab_search_match_title = null;
/* The checkbox for whether the tab search should match the tab URL. */
var _tab_search_match_url = null;
/* The tab selection tree. */
var _tabs_tree = null;
/* The tab title column in the tab selection tree. */
var _tab_title_column = null;
/* The tab destination override column in the tab selection tree. */
var _tab_override_column = null;
/* The tab group destination column in the tab selection tree. */
var _tab_destination_column = null;
/* The rows in the tab selection tree. */
var _tab_rows = null;
/* The rule selection tree. */
var _rules_tree = null;
/* The rule text column in the rule selection tree. */
var _rule_text_column = null;
/* The regex column in the rule selection tree. */
var _rule_is_regex_column = null;
/* The match case column in the rule selection tree. */
var _rule_match_case_column = null;
/* The match title column in the rule selection tree. */
var _rule_match_title_column = null;
/* The match URL column in the rule selection tree. */
var _rule_match_url_column = null;
/* The tab group destination column in the rule selection tree. */
var _rule_destination_column = null;
/* The rows in the rule selection tree. */
var _rule_rows = null;
/* The destination tab group menu list for tabs. */
var _tab_destination = null;
/* The destination tab group menu list for rules. */
var _rule_destination = null;
/* The context menu popup for the tab group selection list box. */
var _tab_groups_list_context_menu = null;
/* The context menu popup for the tab selection tree. */
var _tabs_tree_context_menu = null;
/* The text of the selected rule. */
var _rule_text = null;
/* The checkbox for whether a rule is a regex. */
var _rule_is_regex = null;
/* The checkbox for whether a rule should match case. */
var _rule_match_case = null;
/* The checkbox for whether a rule should match the tab title. */
var _rule_match_title = null;
/* The checkbox for whether a rule should match the tab URL. */
var _rule_match_url = null;
/* The current set of tab groups. */
var _tab_groups = [];
/* The current set of tabs. */
var _tabs = [];
/* True to ignore the select event for _tab_destination. */
var _ignore_tab_destination_select = false;
/* True to ignore the select event for _rule_destination. */
var _ignore_rule_destination_select = false;
/* True if the ruleset has changed since it was loaded or last saved. */
var _ruleset_changed = false;
/* The keyboard shortcut map. */
var _keyboard_shortcuts = {};
/* True if we are showing tab search results. */
var _tab_search_mode = false;

/* Functions: helper: general. */

/* Return the object with ID (1). If the object is not found, return undefined. */
function obj_id_to_obj (objs, id) {
    return _.find (objs, function (obj) {
        return (obj.id == id);
    });
}

/* Functions: event handler helper. */

/* Functions: event handler helper: general user interface. */

/* Strangely, there is no removeAllChildren method or equivalent. See:
https://developer.mozilla.org/en-US/docs/Web/API/Node.removeChild
*/
/* Remove the rows (1) from their tree. Return unit. */
function clear_tree_rows (rows) {
    while (rows.firstChild) { rows.removeChild (rows.firstChild); }
}

/* Remove the items from listbox (1). Return unit. */
function clear_list_box (list) {
    while (list.itemCount > 0) { list.removeItemAt (0); }
}

/* Remove the items from menulist (1). Return unit. */
function clear_menu_list (list) {
    while (list.itemCount > 0) { list.removeItemAt (0); }
}

/* Remove the items from popup menu (1). Return unit. */
function clear_popup_menu (menu) {
    while (menu.firstChild) { menu.removeChild (menu.firstChild); }
}

/* Clear the rule user interface. (1) True to clear the rules tree. Return unit. */
function clear_rule_settings (clear_rules_tree) {
/* Clear the rules tree if the caller specified that. */
    if (clear_rules_tree == true) {
        clear_tree_rows (_rule_rows);
    }
/* Clear the rule text box. */
    _rule_text.value = "";
/* Select the first rule destination menu list item. */
    if (_rule_destination.itemCount > 0) {
        _rule_destination.selectedIndex = 0;
    }
/* Set the is_regex, match_case, match_title, and match_url checkboxes to their default values. */
    _rule_is_regex.checked = false;
    _rule_match_case.checked = false;
    _rule_match_title.checked = true;
    _rule_match_url.checked = true;
}

/* This is currently not used. */
/* Clear the user interface. Return unit. */
//function clear_UI () {
/* We clear controls with selection event handlers first. */
/* Clear the tab group selection list. */
//    clear_list_box (_tab_groups_list);
/* Clear tabs tree. We clear the rules tree in clear_rule_settings. */
//    clear_tree_rows (_tab_rows);
/* Clear the tab group destination menu lists for tabs and rules. */
//    clear_menu_list (_tab_destination);
//    clear_menu_list (_rule_destination);
/* Clear the tabs tree context menu popup. */
//    clear_popup_menu (_tabs_tree_context_menu);
/* Clear the rule settings. */
//    clear_rule_settings ();
//}

/* Return a list of the selected indices in list box (1). */
function get_selected_indices (list) {
    var indices = [];
/* Loop through the list box items. */
    for (var loop = 0; loop < list.itemCount; loop++) {
/* Get the list box item. */
        var item = list.getItemAtIndex (loop);
/* If the list box item is selected, add the index to the results. */
        if (item.selected == true) {
            indices.push (loop);
        }
    }
    return indices;
}

/* Select the next row in tree (1) with rows (2). Return unit. */
function select_next_row (tree, rows) {
/* If only one row is selected... */
    if (tree.view.selection.count == 1) {
/* According to the docs.
"This property indicates only the index of the row with tree cursor around it. This is not a reliable method of determining the selected row, as the selection may include multiple rows, or the focused row may not even be selected."
However, we could not find another way to get the current index, except the way we do it in get_tree_selection, which seems like too much work here. */
/* Get the selected index. */
        var current_index = tree.view.selection.currentIndex;
/* If the last index is not selected, select the next index. */
        if (current_index < rows.childElementCount - 1) {
            tree.view.selection.select (current_index + 1);
        }
    }
}

/* Select the item in menu list (1) that has value (2). Return unit. */
function select_menu_list_item_by_value (list, value) {
/* Loop through the menu list items. */
    for (var loop = 0; loop < list.itemCount; loop++) {
/* Get the menu list item. */
        var item = list.getItemAtIndex (loop);
/* If this menu list item has the indicated value... */
        if (item.value == value) {
/* Select this menu list item. */
            list.selectedIndex = loop;
/* Exit the loop. */
            break;
        }
    }
}

// TODO2 To implement this we'll need to have the oncommand handler for each context menu popup item pass the item index to tabs_tree_context_menu_select_handler.
/* Move the menu popup item with index (2) to the top of popup menu (1). Return unit. */
function move_menu_popup_item_to_top (menu, index) {
}

/* Note DOM functions such as firstChild, childElementCount, and insertBefore do not seem to work as expected with menulists. */

/* Move the menu list item with index (2) to the top of menu list (1). (3) The flag to set to ignore the select event for menu list (1). Return unit. */
function move_menu_list_item_to_top (list, index, ignore_select_flag) {
/* If the index is 0, there is no need to move the item. */
/* If the index is valid and is greater than 0... */
    if (index > 0 && index < list.itemCount) {
/* Get the item at the indicated index. */
        var item = list.getItemAtIndex (index);
/* Insert the item at the top of the menu list. */
        var new_item = list.insertItemAt (0, item.label, item.value);
/* Copy the item attributes. */
        var attributes_to_copy = ["tooltiptext", "oncommand"];
        _.each (attributes_to_copy, function (attribute) {
            new_item.setAttribute (attribute, item.getAttribute (attribute));
        });
/* removeItemAt is supposed to return the item, but it returns undefined. */
/* This deletes the old item, so we do not do this until we are finished copying data from the old item. Because we have already inserted the new item at the top of the menu list, we need to increment the index of the old item by 1. */
        list.removeItemAt (index + 1);
/* Set the flag to ignore the select event for the menu list. */
        ignore_select_flag = true;
/* Re-select the item at its new index. */
        list.selectedIndex = 0;
    }
}

/* See:
https://developer.mozilla.org/en-US/docs/Web/API/Window.openDialog
https://developer.mozilla.org/en-US/docs/Web/API/window.open
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Dialogs_and_Prompts
*/
/* Show the dialog in XUL file (1) with in parameters (2). Return unit. */
function show_dialog (filename, in_params) {
/* This is used to pass parameters to the dialog and receive return values. */
	var params = { inn : in_params, out : null };
/* Show the dialog. The second parameter is the window name, which we do not need. The third parameter is the feature list. The chrome feature is required for the centerscreen feature. */
	window.openDialog (BookmarkSorter.Consts.content_folder + filename, "", "centerscreen, chrome, dialog, modal, resizable=yes", params).focus();
/* If the user clicked Ok, return the parameters. */
	if (params.out) { return params.out; }
	else { return null; }
}

/* Functions: event handler helper: read from tree. */

/* Note do not apply this function to an action that removes rows from the tree. */
/* Apply action (2) to the row index of each row in tree (1). Return the combined results of the action. */
function get_data_from_tree (rows, action) {
/* The combined results of the action. */
    var results = [];
/* Loop through the rule tree rows. */
    for (var index_loop = 0; index_loop < rows.childElementCount; index_loop++) {
/* Apply the action to the index and accumulate the result. */
        results.push (action (index_loop));
    }
    return results;
}

/* See:
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Tree
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Tree_Selection
*/
/* Note do not apply this function to an action that removes rows from the tree. */
/* Apply action (2) to the row index of each selected row in tree (1). Return the combined results of the action. */
function get_tree_selection (tree, action) {
/* getRangeAt requires two empty objects to write to. These will contain the start and end indices of a selection. */
    var start = {};
    var end = {};
/* Get the number of selected ranges. */
    var range_count = tree.view.selection.getRangeCount()
/* The combined results of the action. */
    var selected_rows = [];
/* Loop through the selections. */
    for (var range_loop = 0; range_loop < range_count; range_loop++) {
/* Get the start and end indices of the selection. */
        tree.view.selection.getRangeAt (range_loop, start, end);
/* Loop through the selected rows. */
        for (var index_loop = start.value; index_loop <= end.value; index_loop++) {
/* Apply the action to the selection index and accumulate the result. */
            selected_rows.push (action (index_loop));
        }
    }
    return selected_rows;
}

/* Apply action (3) to the row in tree (2) that corresponds to the X and Y coordinates in event (1). Return unit. */
function tree_mouse_event_helper (event, tree, action) {
/* Get the row index from the event coordinates. */
    var index = tree.treeBoxObject.getRowAt (event.clientX, event.clientY);
/* Apply the action to the row index. */
    if (index > -1) { action (index); }
}

/* Functions: event handler helper: read tab groups. */

/* Return the tab group with ID (1). If there is no such tab group, return null. */
function tab_group_id_to_tab_group (id) {
    var tab_group = obj_id_to_obj (_tab_groups, id);
    if (tab_group !== undefined) { return tab_group; }
    else { return null; }
/* This is currently not used. There are cases where we expect to not find a tab group with the specified ID. For example, the user might load a ruleset that contains a rule with a tab group destination folder that has since been deleted. See the note at the top of this file. */
//    else { throw new Error (sprintf ("main_ui.js: tab_group_id_to_tab_group: Failed to find tab group with ID: %d.", id)); }
}

/* Return the tab with ID (1). */
function tab_id_to_tab (id) {
    var tab = obj_id_to_obj (_tabs, id);
    if (tab !== undefined) { return tab; }
    else { throw new Error (sprintf ("main_ui.js: tab_id_to_tab: Failed to find tab with ID: %d.", id)); }
}

/* Return the IDs of the currently selected tab groups. */
function get_selected_tab_group_ids () {
// TODO2 Why not use map?
/* Loop through the selected tab group list items. */
    return _.reduce (_tab_groups_list.selectedItems, function (acc, item) {
/* Get the tab group ID. */
        acc.push (item.value);
        return acc;
    }, []);
}

/* Return the currently selected tab groups. */
function get_selected_tab_groups () {
/* The selected tab groups. */
    var selected_tab_groups = [];
/* Loop through the selected tab group IDs. */
    _.each (get_selected_tab_group_ids (), function (tab_group_id) {
/* Get the current tab group with the ID. */
        var tab_group = tab_group_id_to_tab_group (tab_group_id);
/* If the tab group was not found, raise an exception. We do not expect the tab group list to contain deleted tab groups. See the note at the top of this file. */
        if (tab_group == null) {
            throw new Error (sprintf ("main_ui.js: get_selected_tab_groups: Failed to find tab group with ID: %d.", tab_group_id));
        }
/* Add the tab group to the results. */
        selected_tab_groups.push (tab_group);
    });
    return selected_tab_groups;
}

/* Return the tabs for the currently selected tab groups. */
function get_tabs_in_selected_tab_groups () {
/* Loop through the selected tab groups. */
    var selected_tab_groups = get_selected_tab_groups ();
// TODO2 Pass in action that handles either bookmark or session tab group? It depends on what tab group the user selected. So maybe we have to pass in both?
// TODO2 Might need to add a field to tab group that says whether it's a bookmark folder or session tab group. Then we can call the appropriate function based on that.
/* Return the tabs that belong to the tab groups. */
    var results = BookmarkSorter.BookmarkUtils.combine_bookmark_folders (BookmarkSorter.BookmarkUtils.read_bookmark_folders (selected_tab_groups));
    return results.tabs;
}

/* Return the currently selected tab groups as destination objects. */
function get_selected_destination () {
/* Get the currently selected tab groups. */
    var selected_tab_groups = get_selected_tab_groups ();
/* If the tab group selection list is not empty... */
    if (selected_tab_groups.length > 0) {
/* Note we currently support selecting only one tab group at a time. */
        var selected_tab_group = selected_tab_groups [0];
/* Set the destination to the currently selected tab group. */
        return {
            tab_group_id : selected_tab_group.id,
            tab_group_title : selected_tab_group.title,
        };
    }
    else { return null; }
}

/* Functions: event handler helper: tab group selection list context menu. */

/* Handle the Add Keyboard Shortcut item in the tab group list context menu. Return unit. */
function add_keyboard_shortcut_handler () {
/* Assign the tab group ID to the key (1). */
    var assign_key = function (key) {
        _keyboard_shortcuts [key] = tab_group_id;
    };
/* Get the IDs of the selected tab groups. */
    var tab_group_ids = get_selected_tab_group_ids ();
    if (tab_group_ids.length > 0) {
/* Note we currently support selecting only one tab group at a time. */
        var tab_group_id = tab_group_ids [0];
/* Ask the user to enter a key. */
	    var result = show_dialog ("add_hotkey.xul", null);
/* If the user entered a key and clicked Ok... */
    	if (result != null) {
            var key = result.key;
/* Look up the existing tab group for this key. */
            var old_tab_group_id = _keyboard_shortcuts [key];
/* If there is an existing tab group for this key... */
            if (old_tab_group_id !== undefined) {
/* Get the existing tab group. */
                var tab_group = tab_group_id_to_tab_group (old_tab_group_id);
/* If the existing tab group has not been deleted... */
                if (tab_group != null) {
/* Ask the user if they want to reassign the key. */
                    var message = sprintf ("The key \"%s\" is already a shortcut for \"%s\". Do you want to reassign this key?", key, tab_group.title);
                    var proceed = Prompts.confirm (window, "Confirm Keyboard Shortcut Change", message);
                    if (proceed == true) { assign_key (key); }
/* If the user does not want to reassign the key, ask them to enter another key. */
                    else { add_keyboard_shortcut_handler (tab_group_id); }
                }
/* If the existing tab group has been deleted, assign the key to the tab group. */
                else { assign_key (key); }
            }
/* If there is no existing tab group for this key, assign the key to the tab group. */
            else { assign_key (key); }
        }
    }
}

/* Handle the View All Keyboard Shortcuts item in the tab group list context menu. Return unit. */
function view_keyboard_shortcuts_handler () {
/* Create a copy of the keyboard shortcuts that includes the tab group title for each keyboard shortcut. */
    var keyboard_shortcuts = {};
/* Loop through the keyboard shortcuts. */
    for (var key in _keyboard_shortcuts) {
/* Get the tab group ID for this keyboard shortcut. */
        var tab_group_id = _keyboard_shortcuts [key];
/* This is the default tab group path in case we cannot get the tab group. */
        var tab_group_path = "(NOT VALID)";
/* Get the tab group. */
        var tab_group = tab_group_id_to_tab_group (tab_group_id);
/* If we found the tab group, get the path. */
        if (tab_group != null) { tab_group_path = tab_group.path; }
/* Assign the tab group ID and path to this entry in the copy of the keyboard shortcuts. */
        keyboard_shortcuts [key] = { tab_group_id : tab_group_id, tab_group_path : tab_group_path };
    }
/* Show the dialog with the keyboard shortcuts. */
    var result = show_dialog ("view_hotkeys.xul", keyboard_shortcuts);
/* If the user clicked Ok... */
    if (result != null) {
/* Get the return value. */
        var keyboard_shortcuts = result.keyboard_shortcuts;
/* Loop through the return value. */
        for (var key in keyboard_shortcuts) {
/* Remove the tab group title from the entry. */
            var value = keyboard_shortcuts [key];
            keyboard_shortcuts [key] = value.tab_group_id;
        }
/* Assign the return value to the member value. */
        _keyboard_shortcuts = keyboard_shortcuts;
    }
}

/* Functions: event handler helper: write tab groups. */

/* Clear the current tab groups and the tab groups user interface. */
function clear_tab_groups () {
/* Clear the tab groups. */
    _tab_groups = [];
/* We clear controls with selection event handlers first. */
/* Clear the tab group selection list. */
    clear_list_box (_tab_groups_list);
/* Clear the tab group destination menu lists for tabs and rules. */
    clear_menu_list (_tab_destination);
    clear_menu_list (_rule_destination);
/* Clear the tabs tree context menu popup. */
    clear_popup_menu (_tabs_tree_context_menu);
}

/* Note we need to update move_menu_list_item_to_top and move_menu_popup_item_to_top if we add any new attributes in the following functions. */

/* Add the tab group data (1-3) to the tab group selection list. Return unit. */
function add_tab_group_to_list (id, title, path) {
// TODO1 Instead of id, use an object that contains id, title, path, whether tab group or bookmark folder.
    var tab_groups_list_item = _tab_groups_list.appendItem (title, id);
    tab_groups_list_item.setAttribute ("tooltiptext", path);
}

/* Add the tab group data (1-3) to the tab group destination menu lists for tabs and rules. Return unit. */
function add_tab_group_to_menu_lists (id, title, path) {
    var tab_groups_menu_item = _tab_destination.appendItem (title, id);
    var rules_menu_item = _rule_destination.appendItem (title, id);
    tab_groups_menu_item.setAttribute ("tooltiptext", path);
    rules_menu_item.setAttribute ("tooltiptext", path);
}

/* See:
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.addEventListener
*/
/* Add the tab group data (1-3) to the tabs tree context menu popup. Return unit. */
function add_tab_group_to_tabs_tree_context_menu (id, title, path) {
/* We cannot call appendItem on a menupopup element. If we put the menupopup element inside a menu element, we cannot put the menu element inside the popupset element (see main_ui.xul). If we use the menu element but not the popupset element, the context menu popup does not appear. So we use popupset and menupopup, and call appendChild instead. */
/* This script is loaded by main_ui.xul, so we have access to the document. */
    var menu_item = document.createElement ("menuitem");
    _tabs_tree_context_menu.appendChild (menu_item);
/* Set the attributes on the new menu popup item. */
    menu_item.setAttribute ("id", id);
    menu_item.setAttribute ("label", title);
    menu_item.setAttribute ("tooltiptext", path);
/* Add the command handler to the new menu popup item. */
    menu_item.addEventListener ("command", function () {
        tabs_tree_context_menu_select_handler (id, title);
    });
}

/* Add the tab group (1) to the current tab groups and the tab group user interface. Return unit. */
function add_tab_group (tab_group) {
/* Add the tab group to the current tab groups. */
    _tab_groups = _tab_groups.concat (tab_group);
/* Get the tab group ID, title, and path. */
    var id = tab_group.id;
    var title = tab_group.title;
    var path = tab_group.path;
/* Add the tab group data to the tab group selection list. */
    add_tab_group_to_list (id, title, path);
/* Add the tab group data to the tab group destination menu lists for tabs and rules. */
    add_tab_group_to_menu_lists (id, title, path);
/* Add the tab group data to the tabs tree context menu popup. */
    add_tab_group_to_tabs_tree_context_menu (id, title, path);
}

/* Add the tab groups (1) to the current tab groups and the tab groups user interface. Return unit. */
function add_tab_groups (tab_groups) {
/* Add the tab groups to the current tab groups and the tab groups user interface. */
    _.each (tab_groups, add_tab_group);
}

/* Clear the current tab groups and the tab groups user interface. Add the tab groups (1) to the current tab groups and the tab groups user interface. Return unit. */
function init_tab_groups (tab_groups) {
/* Clear the current tab groups and the tab group user interface. */
    clear_tab_groups ();
/* Add the tab groups to the current tab groups and the tab group user interface. */
    add_tab_groups (tab_groups);
/* Select the first tab group destination menu list items for the tabs and rules. */
    if (_tab_destination.itemCount > 0) {
        _tab_destination.selectedIndex = 0;
    }
    if (_rule_destination.itemCount > 0) {
        _rule_destination.selectedIndex = 0;
    }
}

/* Functions: event handler helper: read tabs. */

/* Return the tab at index (1) in the tabs tree. */
function get_tab_action (index) {
    return {
/* Get the tab title value, which is a tab ID. */
        id : _tabs_tree.view.getCellValue (index, _tab_title_column),
/* Get the tab destination value, which is a tab group ID. */
        tab_group_id : _tabs_tree.view.getCellValue (index, _tab_destination_column),
    };
}

/* Return the tabs in the tabs tree. */
function get_tabs_from_tree () {
    return get_data_from_tree (_tab_rows, get_tab_action);
}

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/addTab
Tabbrowser.xml line 2505
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/tabbrowser
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/tabs
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Tabbed_browser
*/
/* Open URL (1) in a new tab. Return unit. */
function open_url_in_new_tab (url) {
/* For some reason, if we use the following:
BookmarkSorter.Consts.get_window ().gBrowser
we get an error. */
/* Get the browser window, not the custom window. */
    var browser = BookmarkSorter.Consts.get_window ();
/* Add the tab. The default behavior is to add the tab at the end. Select the tab. */
    browser.gBrowser.selectedTab = browser.gBrowser.addTab (url);
/* Set the focus to the browser window. */
    browser.focus ();
}

/* Functions: event handler helper: write tabs. */

/* Clear the current tabs and the tab user interface. */
function clear_tabs () {
/* Clear the current tabs. */
    _tabs = [];
/* Clear the tab tree. */
    clear_tree_rows (_tab_rows);
}

/* In the tab tree, set the selected tabs to the destination with ID (1) and title (2). */
function set_selected_tabs_destination (tab_group_id, tab_group_title) {
/* The action to apply to each selected row in the tab tree. */
    var action = function (index) {
/* Record that the user has manually set the tab group destination for this tab. We do not apply the rules to this tab. */
        _tabs_tree.view.setCellValue (index, _tab_override_column, 1);
        _tabs_tree.view.setCellText (index, _tab_override_column, "Y");
/* Set the destination tab group for this tab. */
        _tabs_tree.view.setCellValue (index, _tab_destination_column, tab_group_id);
        _tabs_tree.view.setCellText (index, _tab_destination_column, tab_group_title);
        return null;
    };
/* Apply the action to each selected row in the tree. */
    get_tree_selection (_tabs_tree, action);
}

/* See:
This is how to programmatically add rows to a tree.
http://stackoverflow.com/questions/10733638/how-to-add-and-remove-rows-from-a-firefox-addon-xul-tree
http://mb.eschew.org/13
This is how to connect a tree to a data source, if we ever decide to do that.
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeView
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Custom_Tree_Views
*/
/* Add tab (1) and destination (2) to the tab tree. Return unit. */
function add_tab_to_tree (tab, destination) {
/* The id, title, and URL of the tab. */
    var id = tab.id;
    var title = tab.title;
    var url = tab.url;
/* Create the elements needed to add a row to the tree. */
/* This script is loaded by main_ui.xul, so we have access to the document. */
    var item = document.createElement ("treeitem");
    var row = document.createElement ("treerow");
    var tab_cell = document.createElement ("treecell");
    var override_cell = document.createElement ("treecell");
    var destination_cell = document.createElement ("treecell");
/* Set the tab cell attributes. */
    tab_cell.setAttribute ("label", title);
    tab_cell.setAttribute ("value", id);
// TODO2. Try to find out if these can be event targets.
/* See:
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.addEventListener
*/
/* This script is loaded by main_ui.xul, so we have access to the window. */
/*
    tab_cell.addEventListener ("mousemove", function () {
        window.alert ("cell");
    }, false);
    row.addEventListener ("mousemove", function () {
        window.alert ("row");
    }, false);
*/
/* Set the destination override cell attributes. */
    override_cell.setAttribute ("value", 0);
    override_cell.setAttribute ("label", "N");
/* Set the destination cell attributes. */
    destination_cell.setAttribute ("value", destination.tab_group_id);
    destination_cell.setAttribute ("label", destination.tab_group_title);
/* Add the cells to the row. */
    row.appendChild (tab_cell);
    row.appendChild (override_cell);
    row.appendChild (destination_cell);
/* Add the row to the tree. */
    item.appendChild (row);
    _tab_rows.appendChild (item);
}

/* Add tabs (1) to the tab tree. Return unit. */
function add_tabs_from_selected_tab_groups_to_tree (tabs) {
/* Get the current rules. */
    var rules = get_rules_from_tree ();
/* Get the destination for each tab. */
    var destination = get_selected_destination ();
/* If the destination exists... */
    if (destination != null) {
/* Add each tab to the tab tree. */
        _.each (tabs, function (tab) {
/* Add the tab to the tree. */
            add_tab_to_tree (tab, destination);
// TODO1 apply_rules_to_tab isn't declared yet.
// TODO1 Contrary to the comment, bookmark_added_handler simply calls init_tabs_if_tab_group_is_selected. We should change that, or change this function to use apply_rules_to_tabs.
/* Note add_tabs_from_selected_tab_groups_to_tree is called with a single tab by bookmark_added_handler. That is why we call apply_rules_to_tab on each tab, rather than call apply_rules_to_tabs at the end of add_tabs_from_selected_tab_groups_to_tree. */
/* Apply the rules to the tab. apply_rules_to_tab needs the index of the tab in the tabs tree. We just added the tab to the tab tree, so get the last index in the tab tree. */
            apply_rules_to_tab (_tab_rows.childElementCount - 1, tab, rules);
        });
    }
}

/* Add tabs (1) to the tab tree. Return unit. */
function add_tabs_from_tab_search_to_tree (tabs) {
/* Return the tab group with ID (1). */
    var get_tab_destination = function (tab_group_id) {
/* Get the current tab group with the ID. */
        var tab_group = tab_group_id_to_tab_group (tab_group_id);
/* If the tab group was not found, raise an exception. We do not expect tabs to belong to deleted tab groups. See the note at the top of this file. */
        if (tab_group == null) {
            throw new Error (sprintf ("main_ui.js: add_tabs_from_tab_search_to_tree: Failed to find tab group with ID: %d.", tab_group_id));
        }
        return {
            tab_group_id : tab_group_id,
            tab_group_title : tab_group.title,
        };
    };
/* Add each tab to the tab tree. */
    _.each (tabs, function (tab) {
/* Get the destination for the tab. */
        var destination = get_tab_destination (tab.tab_group_id);
/* Add the tab to the tree. */
        add_tab_to_tree (tab, destination);
    });
// TODO1 apply_rules_to_tabs isn't declared yet.
/* Apply the rules to the tabs. */
    apply_rules_to_tabs ();
}

/* Add tabs (1) to the current tabs and the user interface. Return unit. */
function add_tabs_from_selected_tab_groups (tabs) {
/* Add the tabs to the current tabs. */
    _tabs = _tabs.concat (tabs);
/* Add the tabs to the tree. */
    add_tabs_from_selected_tab_groups_to_tree (tabs);
}

/* Add tabs (1) to the current tabs and the user interface. Return unit. */
function add_tabs_from_tab_search (tabs) {
/* Add the tabs to the current tabs. */
    _tabs = _tabs.concat (tabs);
/* Add the tabs to the tree. */
    add_tabs_from_tab_search_to_tree (tabs);
}

/* Clear the current tabs and the tab user interface. Add the tabs for the currently selected tab group to the current tabs and the tab user interface. Return unit. */
function init_tabs () {
/* Clear the current tabs and the tab user interface. */
    clear_tabs ();
/* Get the tabs for the currently selected tab groups. */
    var tabs = get_tabs_in_selected_tab_groups ();
/* Add the tabs to the current tabs and the tab user interface. Set the currently selected tab group as the destination for each tab. */
    add_tabs_from_selected_tab_groups (tabs);
}

/* If the tab group with ID (1) is currently selected, reset the current tabs and tab user interface. */
function init_tabs_if_tab_group_is_selected (parent_id) {
/* Get the currently selected tab group IDs. */
    var selected_tab_group_ids = get_selected_tab_group_ids ();
/* _.find returns undefined if the item was not found. */
/* If the specified tab group is currently selected... */
    if (undefined !== _.find (selected_tab_group_ids, function (selected_tab_group_id) {
        return (selected_tab_group_id == parent_id);
    })) {
/* Reset the current tabs and tab user interface. */
        init_tabs ();
    }
}

/* Functions: event handler helper: read rules. */

/* Return a rule based on the data in the user interface. */
function get_rule_from_user_interface () {
    return {
/* Get the rule text. */
        rule : _rule_text.value,
/* Get the selected tab group destination. */
        tab_group_id : _rule_destination.value,
        tab_group_title : _rule_destination.label,
/* Get the is regex checkbox value. */
        is_regex : _rule_is_regex.checked,
/* Get the match case checkbox value. */
        match_case : _rule_match_case.checked,
/* Get the match title checkbox value. */
        match_title : _rule_match_title.checked,
/* Get the match url checkbox value. */
        match_url : _rule_match_url.checked,
    };
}

/* Return the rule at index (1) in the rules tree. */
function get_rule_action (index) {
    return {
/* Get the index. */
        index : index,
/* Get the rule text. */
        rule : _rules_tree.view.getCellText (index, _rule_text_column),
/* The is regex column has a value of 0 for false, 1 for true. */
        is_regex : (_rules_tree.view.getCellValue (index, _rule_is_regex_column) == 1),
/* The match case column has a value of 0 for false, 1 for true. */
        match_case : (_rules_tree.view.getCellValue (index, _rule_match_case_column) == 1),
/* The match title column has a value of 0 for false, 1 for true. */
        match_title : (_rules_tree.view.getCellValue (index, _rule_match_title_column) == 1),
/* The match URL column has a value of 0 for false, 1 for true. */
        match_url : (_rules_tree.view.getCellValue (index, _rule_match_url_column) == 1),
/* Get the rule destination value, which is a tab group ID. */
        tab_group_id : _rules_tree.view.getCellValue (index, _rule_destination_column),
    };
}

/* Return the rules in the rules tree. */
function get_rules_from_tree () {
    return get_data_from_tree (_rule_rows, get_rule_action);
}

/* Functions: event handler helper: write rules. */

/* In the rule tree, set the selected rules to have the properties of rule (1). */
function update_selected_rules (rule) {
/* Set tree cell at index (1) and column (2) to value (3). Return unit. */
    var set_checkbox_cell = function (index, column, checked) {
        if (checked == true) {
            _rules_tree.view.setCellValue (index, column, 1);
            _rules_tree.view.setCellText (index, column, "Y");
        }
        else {
            _rules_tree.view.setCellValue (index, column, 0);
            _rules_tree.view.setCellText (index, column, "N");
        }
    };
/* We currently support selecting only one rule at a time. So we do not create an action or call get_tree_selection like set_selected_tabs_destination. */
/* Get the currently selected rule index. */
    var index = _rules_tree.currentIndex;
/* Set the rule text for this rule. */
    _rules_tree.view.setCellText (index, _rule_text_column, rule.rule);
/* Set the is_regex, match_case, match_title, and match_url columns for this rule. */
    set_checkbox_cell (index, _rule_is_regex_column, rule.is_regex);
    set_checkbox_cell (index, _rule_match_case_column, rule.match_case);
    set_checkbox_cell (index, _rule_match_title_column, rule.match_title);
    set_checkbox_cell (index, _rule_match_url_column, rule.match_url);
/* Set the destination tab group for this rule. */
    _rules_tree.view.setCellValue (index, _rule_destination_column, rule.tab_group_id);
    _rules_tree.view.setCellText (index, _rule_destination_column, rule.tab_group_title);
// TODO1 apply_rules_to_tabs isn't declared yet.
/* Apply the rules to the tabs. */
    apply_rules_to_tabs ();
/* Set the ruleset changed flag. */
    _ruleset_changed = true;
}

/* In the rule tree, set the rules that have deleted tab group destination ID (1) to have an invalid destination. See the note at the top of this file. Return unit. */
function update_rules_deleted_tab_group (deleted_tab_group_id) {
/* The action to apply to each row in the rule tree. */
    var action = function (index) {
/* Get the rule destination value, which is a tab group ID. */
        var tab_group_id = _rules_tree.view.getCellValue (index, _rule_destination_column);
/* If the rule destination tab group ID matches the deleted tab group ID... */
        if (tab_group_id == deleted_tab_group_id) {
/* Set the rule to have an invalid destination. */
            _rules_tree.view.setCellValue (index, _rule_destination_column, -1);
            _rules_tree.view.setCellText (index, _rule_destination_column, "(NOT VALID)");
        }
    };
/* Apply the action to each row in the rule tree. */
    get_data_from_tree (_rule_rows, action);
}

/* Add rule (1) to the rule tree. Return unit. */
function add_rule_to_tree (rule) {
/* Set tree cell (1) to value (2). Return unit. */
    var set_checkbox_cell = function (cell, checked) {
        if (checked == true) {
            cell.setAttribute ("value", 1);
            cell.setAttribute ("label", "Y");
        }
        else {
            cell.setAttribute ("value", 0);
            cell.setAttribute ("label", "N");
        }
    };
/* Create the elements needed to add a row to the tree. */
/* This script is loaded by main_ui.xul, so we have access to the document. */
    var item = document.createElement ("treeitem");
    var row = document.createElement ("treerow");
    var rule_cell = document.createElement ("treecell");
    var is_regex_cell = document.createElement ("treecell");
    var match_case_cell = document.createElement ("treecell");
    var match_title_cell = document.createElement ("treecell");
    var match_url_cell = document.createElement ("treecell");
    var destination_cell = document.createElement ("treecell");
/* Get the destination tab group for the rule. This can fail because the user loads a ruleset that contains a rule with a destination tab group that was deleted since the last time the ruleset was loaded. See the note at the top of this file. */
    var tab_group = tab_group_id_to_tab_group (rule.tab_group_id);
    if (tab_group == null) {
        rule.tab_group_id = -1;
        tab_group = {
            title : "(NOT VALID)",
        };
    }
/* Set the attributes for the rule cell. */
    rule_cell.setAttribute ("label", rule.rule);
/* Set the attributes for the is_regex, match_case, match_title, and match_url cells. */
    set_checkbox_cell (is_regex_cell, rule.is_regex);
    set_checkbox_cell (match_case_cell, rule.match_case);
    set_checkbox_cell (match_title_cell, rule.match_title);
    set_checkbox_cell (match_url_cell, rule.match_url);
/* Set the attributes for the destination cell. */
    destination_cell.setAttribute ("value", rule.tab_group_id);
    destination_cell.setAttribute ("label", tab_group.title);
/* Add the cells to the row. */
    row.appendChild (rule_cell);
    row.appendChild (is_regex_cell);
    row.appendChild (match_case_cell);
    row.appendChild (match_title_cell);
    row.appendChild (match_url_cell);
    row.appendChild (destination_cell);
/* Add the row to the tree. */
    item.appendChild (row);
    _rule_rows.appendChild (item);
}

/* Add rules (1) to the rule tree. Return unit. */
function add_rules_to_tree (rules) {
    _.each (rules, add_rule_to_tree);
}

/* Functions: event handler helper: apply rules. */

/* See:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
*/
/* Escape all regex operators in (1). Return the result. */
function escape_regex (exp) {
    return exp.replace (/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
}

/* Return true if tab (1) is matched by non-regular expression search text (2). (3) True to match the tab title. (4) True to match the tab URL. (5) The flags to use with the regular expression. */
function match_search_text_to_tab (tab, search_text, match_title, match_url, flags) {
/* Split the search text into "or" parts. */
    var or_parts = search_text.split (",");
/* Loop through the "or" parts and see if the tab meets any of them. */
    var result = _.find (or_parts, function (or_part) {
/* Split the "or" part into "and" parts. */
        var and_parts = or_part.split ("&");
/* See if the tab meets all of the "and" parts. */
        return _.every (and_parts, function (and_part) {
/* It seems there are only two ways to perform a case-insensitive string comparison in Javascript. (1) Use string.toUpperCase/toLocaleUpperCase or string.toLowerCase/toLocaleLowerCase. However, it seems these do not return consistent results. (2) Use a regular expression. However, we want to interpret all characters in the search text literally, so we escape the regex. */
/* The regex to find the "and" part. */
            var regex = new RegExp (escape_regex (and_part), flags);
/* Return true if (1) we want to match the tab title, and the tab title contains the "and" part, or (2) we want to match the tab URL, and the tab URL contains the "and" part. */
            return (
                (match_title == true && tab.title.search (regex) > -1) ||
                (match_url == true && tab.url.search (regex) > -1)
            );
        });
    });
/* Return whether tab met any of the "or" parts. */
    return (result !== undefined);
}

/* Return true if tab (1) is matched by regular expression (2). (3) True to match the tab title. (4) True to match the tab URL. (5) The flags to use with the regular expression. */
function match_regex_to_tab (tab, search_text, match_title, match_url, flags) {
/* The regex. */
    var regex = new RegExp (search_text, flags);
/* Return true if (1) we want the regex to match the tab title, and it does, or (2) we want the regex to match the tab URL, and it does. */
    return (
        (match_title == true && tab.title.search (regex) > -1) ||
        (match_url == true && tab.url.search (regex) > -1)
    );
}

/* Return true if tab (1) is matched by search text or regular expression (2). (3) True if (2) is a regular expression. (4) True if the match is case sensitive. (5) True to match the tab title. (6) True to match the tab URL. */
function match_tab (tab, search_text, is_regex, match_case, match_title, match_url) {
/* True if the tab is matched. */
    var result = false;
/* The flags to use with the regular expressions. */
    var flags = "";
/* If the match is not case sensitive, add that to the regex flags. */
    if (match_case == false) {
        flags = "i";
    }
/* See whether the search text is to be treated as a regular expression. */
    if (is_regex == true) {
        result = match_regex_to_tab (tab, search_text, match_title, match_url, flags);
    }
    else {
        result = match_search_text_to_tab (tab, search_text, match_title, match_url, flags);
    }
    return result;
}

/* Return true if tab (1) is matched by rule (2). */
function match_rule_to_tab (tab, rule) {
/* True if the tab is matched. */
    var result = false;
/* Ignore empty rules. Ignore rules with invalid destination tab groups. See the note at the top of this file. */
    if (rule.rule.trim ().length > 0 && rule.tab_group_id > -1) {
        result = match_tab (tab, rule.rule, rule.is_regex, rule.match_case, rule.match_title, rule.match_url);
    }
    return result;
}

/* Note this function is typically applied to all of the tabs, so it would be inefficient to call get_rules_from_tree inside it. Instead, it takes the rules as a parameter. */
/* Return the rules in (2) that match tab (1). */
function match_rules_to_tab (tab, rules) {
/* Loop through the rules and see if the tab meets any of them. */
    return _.filter (rules, _.partial (match_rule_to_tab, tab));
}

/* Note this function is called when we apply the rules to the tabs, not when the user sets a tab destination manually. */
/* Set the tab at index (1) of the tab tree to have the tab group with ID (2) as its destination. Return unit. */
function set_tab_to_destination (index, tab_group_id) {
/* Get the destination tab group for the rule. */
    var tab_group = tab_group_id_to_tab_group (tab_group_id);
/* If the tab group was not found, raise an exception. A rule that has a deleted tab group destination is set to have an invalid destination instead. apply_rules_to_tabs and its helpers ignore rules with invalid destinations. So we do not expect to find a rule with a deleted tab group destination here. See the note at the top of this file. */
    if (tab_group == null) {
        throw new Error (sprintf ("main_ui.js: set_tab_to_destination: Failed to find tab group with ID: %d.", tab_group_id));
    }
    else {
/* Update the tab group destination for the tab. */
        _tabs_tree.view.setCellValue (index, _tab_destination_column, tab_group_id);
        _tabs_tree.view.setCellText (index, _tab_destination_column, tab_group.title);
    }
}

/* Note this function is typically applied to all of the tabs, so it would be inefficient to call get_rules_from_tree inside it. Instead, it takes the rules as a parameter. */
/* Note this function assumes that the tab does not have its destination set manually. apply_rules_to_tabs verifies that. */
/* Apply the rules (3) to tab (2). If the tab meets one of the rules, set the destination for index (1) in the tab tree. Return unit. */
function apply_rules_to_tab (index, tab, rules) {
/* If the tab meets any rules... */
    var matching_rules = match_rules_to_tab (tab, rules);
    if (matching_rules.length > 0) {
/* Set the tab destination to that of the first rule that matches the tab. */
        set_tab_to_destination (index, matching_rules [0].tab_group_id);
    }
/* If the tab does not meet any rules, and does not have its destination set manually, set its destination back to the original tab group. This is contained in the tab_group_id field of the tab object. */
    else {
        set_tab_to_destination (index, tab.tab_group_id);
    }
}

/* apply_rules_to_tabs is called in the following places.
add_tabs_from_selected_tab_groups_to_tree (actually calls apply_rules_to_tab)
add_tabs_from_tab_search_to_tree
update_selected_rules
add_rule_click_handler_helper
delete_rule_click_handler_helper
move_rule_up_click_handler_helper
move_rule_down_click_handler_helper
load_ruleset
*/
/* Apply the current rules to the current tabs. Return unit. */
function apply_rules_to_tabs () {
/* Get the current rules. */
    var rules = get_rules_from_tree ();
/* The action to apply to each row in the tab tree. */
    var action = function (index) {
/* Get the ID of the tab, and get the tab from the current tabs. */
        var tab = tab_id_to_tab (_tabs_tree.view.getCellValue (index, _tab_title_column));
/* If the user has manually set the tab group destination for this tab, do not apply the rules to it. */
        if (_tabs_tree.view.getCellValue (index, _tab_override_column) == 0) {
/* Apply the rules to the tab. */
            apply_rules_to_tab (index, tab, rules);
        }
        return null;
    };
/* Apply the action to each row in the tab tree. */
    get_data_from_tree (_tab_rows, action);
}

/* Event handler helper: move tabs. */

/* Return log data for moving tab (1). (2) The tab data from the tab tree. (3) The existing log data. */
function log_moved_tab (tab, tab_in_tree, log_string) {
/* Get the old tab group. */
    var old_tab_group = tab_group_id_to_tab_group (tab.tab_group_id);
/* Get the new tab group. */
    var new_tab_group = tab_group_id_to_tab_group (tab_in_tree.tab_group_id);
/* If the old tab group was not found, raise an exception. old_tab_group comes from a tab in _tabs. _tabs is reloaded when we detect the user deletes a bookmark folder. See the note at the top of this file. */
    if (old_tab_group == null) {
        throw new Error (sprintf ("main_ui.js: move_click_handler_helper: Failed to find the original tab group for a tab to be moved. Tab group ID: %d.", tab_group_id));
    }
/* If the new tab group was not found, raise an exception. new_tab_group comes from the destination column in _tabs_tree. Neither the user nor apply_rules_to_tabs and its helpers should be able to set a tab to have a deleted or invalid destination. See the note at the top of this file. */
    if (new_tab_group == null) {
        throw new Error (sprintf ("main_ui.js: move_click_handler_helper: Failed to find the destination tab group for a tab to be moved. Tab group ID: %d.", tab_group_id));
    }
    return sprintf ("%s\nTitle: \"%s\". URL: \"%s\". Old tab group: \"%s\". New tab group: \"%s\".", log_string, tab.title, tab.url, old_tab_group.path, new_tab_group.path);
}

/* Move the tabs to their destination tab groups. Return log data for moving the tabs. */
function move_tabs (log_moved_tabs) {
    var log_string = "";
/* Loop through the tabs in the tabs tree. */
    _.each (get_tabs_from_tree (), function (tab_in_tree) {
/* Get the tab object that corresponds to the tab in the tree. */
        var tab = tab_id_to_tab (tab_in_tree.id);
/* If the tab in the tree has a different tab group ID than the tab object... */
        if (tab.tab_group_id != tab_in_tree.tab_group_id) {
/* If the user wants to log moved tabs, update the log string. */
            if (log_moved_tabs == true) {
                log_string = log_moved_tab (tab, tab_in_tree, log_string);
            }
/* Move the tab to the new tab group. */
            BookmarkSorter.BookmarkUtils.move_bookmark (tab.id, tab_in_tree.tab_group_id);
        }
    });
    return log_string;
}

/* Functions: event handler. */

/* Functions: event handler: tab group list box. */

/* Handle the select event for the tab group selection list. Return unit. */
function tab_group_select_handler_helper () {
/* Record that we are not showing tab search results. */
    _tab_search_mode = false;
/* Add the tabs for the selected tab group to the current tabs and the user interface. */
    init_tabs ();
}

/* Functions: event handler: tab search button. */

/* Handle the click event for the tab search button. Return unit. */
function tab_search_click_handler_helper () {
    var search_text = _tab_search_text.value;
    var is_regex = _tab_search_is_regex.checked;
    var match_case = _tab_search_match_case.checked;
    var match_title = _tab_search_match_title.checked;
    var match_url = _tab_search_match_url.checked;
/* TODO1 This function is also called by the bookmark added/changed/moved/removed handlers, so showing a message might not be appropriate in those cases. */
/* If the search text box is empty, warn the user. */
    if (search_text.trim ().length == 0) {
        window.alert ("Please enter the text for the tab search.");
    }
    else {
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/listbox (selectedIndex)
"By assigning -1 to this property, all items will be deselected."
*/
        _tab_groups_list.selectedIndex = -1;
/* Record that we are showing tab search results. */
        _tab_search_mode = true;
/* Clear the current tabs and the tab user interface. */
        clear_tabs ();
/* Get all bookmarks. We could not find a way to query for all bookmarks in all bookmark folders. */
        var sessions = BookmarkSorter.BookmarkUtils.read_all_bookmark_folders ();
        var combined_session = BookmarkSorter.BookmarkUtils.combine_bookmark_folders (sessions);
        var tabs = combined_session.tabs;
/* Filter out the bookmarks that do not meet the search criteria. */
        tabs = _.filter (tabs, function (tab) {
            return match_tab (tab, search_text, is_regex, match_case, match_title, match_url);
        });
/* Add the tabs to the current tabs and the tab user interface. */
        add_tabs_from_tab_search (tabs);
    }
}

/* Functions: event handler: tabs tree. */

/* Handle the select event for the tab tree. Return unit. */
function tab_select_handler_helper () {
/* The action to apply to each selected row. */
    var action = function (index) {
/* Return the tab destination value, which is a tab group ID. */
        return _tabs_tree.view.getCellValue (index, _tab_destination_column);
    };
/* Get the destination tab group IDs of the selected tabs. */
    var tab_group_ids = get_tree_selection (_tabs_tree, action);
/* If any tabs are selected... */
    if (tab_group_ids.length > 0) {
/* If multiple tabs are selected, we simply get the destination tab group ID for the first tab. */
/* Get the destination tab group ID of the first selected tab. */
        var tab_group_id = tab_group_ids [0];
/* Select the tab group in the destination tab group menu list. */
        select_menu_list_item_by_value (_tab_destination, tab_group_id);
    }
}

/* Previously, we handled mouseover, but that was only triggered when the mouse left the tree and re-entered it. As a result, moving the mouse from one row to another did not change the tooltip, which was not the correct behavior. */
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeBoxObject
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Tree (Getting the cell from a mouse click)
*/
/* Handle the mousemove event for the tab tree. Return unit. */
function tab_mouse_move_handler (event) {
/* The action to apply to the row index. */
    var action = function (row) {
/* Get the tab ID for this row. */
        var tab_id = _tabs_tree.view.getCellValue (row, _tab_title_column);
/* Get the tab. */
        var tab = tab_id_to_tab (tab_id);
/* Set the tool tip text to the tab URL. */
        _tab_rows.setAttribute ("tooltiptext", tab.url);
    }
    tree_mouse_event_helper (event, _tabs_tree, action);
}

/* Handle the dblclick event for the tab tree. Return unit. */
function tab_mouse_double_click_handler_helper (event) {
/* The action to apply to the row index. */
    var action = function (row) {
/* Get the tab ID for this row. */
        var tab_id = _tabs_tree.view.getCellValue (row, _tab_title_column);
/* Get the tab. */
        var tab = tab_id_to_tab (tab_id);
/* Open the tab URL in a new browser tab. */
        open_url_in_new_tab (tab.url);
    }
    tree_mouse_event_helper (event, _tabs_tree, action);
}

/* See:
https://developer.mozilla.org/en-US/docs/Web/API/event.preventDefault
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeSelection
*/
/* Handle the key down event for the tab tree. Return unit. */
function tab_key_down_handler_helper (event) {
/* Get the key the user pressed. */
    var key = event.key;
/* Get the tab group ID for this key. */
    var tab_group_id = _keyboard_shortcuts [key];
/* If this key has a tab group ID assigned... */
    if (tab_group_id !== undefined) {
/* Get the tab group. */
        var tab_group = tab_group_id_to_tab_group (tab_group_id);
/* If the tab group was not found, tell the user. */
        if (tab_group == null) {
            var message = "We could not find the bookmark folder to which this keyboard shortcut is assigned.";
            window.alert (message);
        }
/* If the tab group was found... */
        else {
/* Note previously, we handled the key up event. However, the tree has a default key down handler, which interferes with our handler. We must handle the key down event and cancel it to replace the default handler with ours. */
            event.preventDefault ();
/* Set the tab group as the destination for the selected tabs. */
            set_selected_tabs_destination (tab_group_id, tab_group.title);
/* Select the next tab. */
            select_next_row (_tabs_tree, _tab_rows);
        }
    }
}

/* Handle the select event for the tab selection tree context menu popup. */
function tabs_tree_context_menu_select_handler (tab_group_id, tab_group_title) {
    set_selected_tabs_destination (tab_group_id, tab_group_title);
/* Select the next tab. */
    select_next_row (_tabs_tree, _tab_rows);
}

/* Functions: event handler: rules tree. */

/* Handle the select event for the rule tree. Return unit. */
function rule_select_handler_helper () {
/* Get the destination tab group IDs of the selected rules. */
    var selected_rules = get_tree_selection (_rules_tree, get_rule_action);
/* If any rules are selected... */
    if (selected_rules.length > 0) {
/* We currently support selecting only one rule at a time. */
/* Set the rule text to that of the first selected rule. */
        _rule_text.value = selected_rules [0].rule;
/* Get the destination tab group ID of the first selected rule. */
        var tab_group_id = selected_rules [0].tab_group_id;
/* Verify the destination is valid. See the note at the top of this file. */
        if (tab_group_id > -1) {
/* Select the tab group in the destination tab group menu list. */
            select_menu_list_item_by_value (_rule_destination, tab_group_id);
        }
/* If the destination is not valid, clear the selection for the destination tab group menu list. */
        else {
            _rule_destination.selectedIndex = -1;
        }
/* Set the is_regex, match_case, match_title, and match_url checkboxes to match the rule. */
        _rule_is_regex.checked = selected_rules [0].is_regex;
        _rule_match_case.checked = selected_rules [0].match_case;
        _rule_match_title.checked = selected_rules [0].match_title;
        _rule_match_url.checked = selected_rules [0].match_url;

    }
// TODO2 Style tabs that match selected rules. Loop through tab tree, then loop through selected rules, and call match_rule_to_tab.
//     tab_cell.setAttribute ("properties", "matches_rule");
}

/* Functions: event handler: tab group menu lists. */

/* Handle the select event for the destination tab group menu list for tabs. Return unit. */
function tab_destination_select_handler_helper () {
/* If the flag to ignore this event is set, clear it. */
    if (_ignore_tab_destination_select == true) {
        _ignore_tab_destination_select = false;
    }
    else {
/* Set the destination tab group for the selected tabs. */
        set_selected_tabs_destination (_tab_destination.value, _tab_destination.label);
/* Select the next tab. */
        select_next_row (_tabs_tree, _tab_rows);
/* Move the selected item to the top of the menu list. */
        move_menu_list_item_to_top (_tab_destination, _tab_destination.selectedIndex, _ignore_tab_destination_select);
    }
}

/* Handle the select event for the destination tab group menu list for rules. Return unit. */
function rule_destination_select_handler_helper () {
/* If the flag to ignore this event is set, clear it. */
    if (_ignore_rule_destination_select == true) {
        _ignore_rule_destination_select = false;
    }
    else {
/* Note we call set_selected_tabs_destination in tab_destination_select_handler_helper, but we do not call update_selected_rules here. save_rule_click_handler_helper calls it instead. */
/* Move the selected item to the top of the menu list. */
        move_menu_list_item_to_top (_rule_destination, _rule_destination.selectedIndex, _ignore_rule_destination_select);
    }
}

/* Functions: event handler: buttons. */

/* Handle the add rule button click event. Return unit. */
function add_rule_click_handler_helper () {
/* If the rule text is empty, warn the user. */
    if (_rule_text.value.trim ().length == 0) {
/* This script is loaded by main_ui.xul, so we have access to the window. */
        window.alert ("Please enter the text for the rule.");
    }
/* If no rule destination tab group is selected, warn the user. */
    else if (_rule_destination.selectedIndex == -1) {
        window.alert ("Please select a destination for the rule.");
    }
    else {
        var item = _rule_destination.selectedItem;
/* Get the rule data. */
        var rule = get_rule_from_user_interface ();
/* Add the rule to the rule tree. */
        add_rule_to_tree (rule);
/* Note it seems you can get currentIndex on a tree but not set it, even if the seltype attribute is set to single. */
/* Select the new rule. */
        _rules_tree.view.selection.select (_rule_rows.childElementCount - 1);
/* Apply the rules to the tabs. */
        apply_rules_to_tabs ();
/* Set the ruleset changed flag. */
        _ruleset_changed = true;
    }
}

/* Handle the save rule button click event. Return unit. */
function save_rule_click_handler_helper () {
/* We currently support selecting only one rule at a time. */
/* Get the currently selected rule index. */
    var index = _rules_tree.currentIndex;
/* If no rule is selected, warn the user. */
    if (index == -1) {
        window.alert ("Please select a rule.");
    }
/* If the rule text is empty, warn the user. */
    else if (_rule_text.value.trim ().length == 0) {
/* This script is loaded by main_ui.xul, so we have access to the window. */
        window.alert ("Please enter the text for the rule.");
    }
/* If there is no rule destination tab group selected, warn the user. */
    else if (_rule_destination.selectedIndex == -1) {
        window.alert ("Please select a destination for the rule.");
    }
/* If there is a currently selected rule... */
    else {
/* Verify that the user wants to proceed, to prevent them from accidentally saving over the wrong rule. */
        var old_rule = _rules_tree.view.getCellText (index, _rule_text_column);
        var old_destination = _rules_tree.view.getCellText (index, _rule_destination_column);
        var new_rule = _rule_text.value;
        var new_destination = _rule_destination.label;
        var message = sprintf ("Are you sure you want to overwrite this rule?\nOld rule:\t\t%s\nNew rule:\t\t%s\nOld destination:\t%s\nNew destination:\t%s", old_rule, new_rule, old_destination, new_destination);
/* Get the rule data. */
        var rule = get_rule_from_user_interface ();
/* This script is loaded by main_ui.xul, so we have access to the window. */
        var proceed = Prompts.confirm (window, "Confirm Rule Overwrite", message);
        if (proceed == true) {
/* Set the selected rules to the selected tab group destination. */
            update_selected_rules (rule);
        }
    }
}

/* Handle the delete rule button click event. Return unit. */
function delete_rule_click_handler_helper () {
/* We currently support selecting only one rule at a time. */
/* Get the currently selected rule index. */
    var index = _rules_tree.currentIndex;
/* If there is a currently selected rule... */
    if (index > -1) {
/* Verify that the user wants to proceed. */
        var message = "Are you sure you want to delete this rule?";
/* This script is loaded by main_ui.xul, so we have access to the window. */
        var proceed = Prompts.confirm (window, "Confirm Rule Delete", message);
        if (proceed == true) {
/* Delete the rule. */
            _rule_rows.removeChild (_rule_rows.childNodes [index]);
/* Deleting a rule clears the currently selected rule, so clear the rule user interface. Do not clear the rules tree. This also covers the case when the user deletes the last rule in the rules tree. */
            clear_rule_settings (false);
/* Apply the rules to the tabs. */
            apply_rules_to_tabs ();
/* Set the ruleset changed flag. */
            _ruleset_changed = true;
        }
    }
}

/* See:
https://developer.mozilla.org/en-US/docs/Web/API/Node.insertBefore
*/
/* Handle the move rule up button click event. Return unit. */
function move_rule_up_click_handler_helper () {
/* We currently support selecting only one rule at a time. */
/* Get the currently selected rule index. */
    var index = _rules_tree.currentIndex;
/* If there is a currently selected rule, and the rule is not the first rule in the tree... */
    if (index > 0) {
/* Get the currently selected rule. */
        var rule = _rule_rows.childNodes [index];
/* Get the previous rule. */
        var previous_rule = _rule_rows.childNodes [index - 1];
/* Insert the rule before the previous rule. */
        _rule_rows.insertBefore (rule, previous_rule);
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Tree_Selection
"Note that you should not just change the tree's currentIndex property to change the selection." */
/* Re-select the rule. */
        _rules_tree.view.selection.select (index - 1);
/* Apply the rules to the tabs. */
        apply_rules_to_tabs ();
/* Set the ruleset changed flag. */
        _ruleset_changed = true;
    }
}

/* Handle the move rule down button click event. Return unit. */
function move_rule_down_click_handler_helper () {
/* We currently support selecting only one rule at a time. */
/* Get the currently selected rule index. */
    var index = _rules_tree.currentIndex;
/* If there is a currently selected rule, and the rule is not the last rule in the tree... */
    if (index > -1 && index < (_rule_rows.childElementCount - 1)) {
/* Get the currently selected rule. */
        var rule = _rule_rows.childNodes [index];
/* Get the next rule. */
        var next_rule = _rule_rows.childNodes [index + 1];
/* Insert the next rule before the currently selected rule. */
        _rule_rows.insertBefore (next_rule, rule);
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Tree_Selection
"Note that you should not just change the tree's currentIndex property to change the selection." */
/* Re-select the rule. */
        _rules_tree.view.selection.select (index + 1);
/* Apply the rules to the tabs. */
        apply_rules_to_tabs ();
/* Set the ruleset changed flag. */
        _ruleset_changed = true;
    }
}

/* Load the ruleset from file (2) with path (1). Return unit. */
function load_ruleset (path, file) {
/* File.readFile returns an object. Get the file contents from the object. */
    var rules = JSON.parse (file.contents);
/* If the ruleset was saved by a version of BookmarkSorter before version 0.3, the rule will not have values for the is_regex or match_case fields, so we add default values. */
/* If the ruleset was saved by a version of BookmarkSorter before version 0.5, the rule will not have values for the match_title or match_url fields, so we add default values. */
    _.each (rules, function (rule) {
        if (rule.is_regex === undefined) {
            rule.is_regex = false;
        }
        if (rule.match_case === undefined) {
            rule.match_case = false;
        }
        if (rule.match_title === undefined) {
            rule.match_title = true;
        }
        if (rule.match_url === undefined) {
            rule.match_url = true;
        }
    });
/* Clear the rule user interface. Clear the rule tree. */
    clear_rule_settings (true);
/* Add the rules to the rule tree. */
    add_rules_to_tree (rules);
/* Apply the rules to the tabs. */
    apply_rules_to_tabs ();
/* Clear the ruleset changed flag. */
    _ruleset_changed = false;
/* Save the path to the preferences. */
    BookmarkSorter.PreferenceUtils.set_ruleset_folder_pref_value (path);
}

/* Handle the load ruleset button click event. Return unit. */
function load_ruleset_click_handler_helper () {
/* If the ruleset has changed since it was loaded or last saved, verify that the user wants to proceed. */
    var proceed = true;
    if (_ruleset_changed == true) {
        var message = "The current ruleset has changed since you loaded it or last saved it. Are you sure you want to load a different ruleset?";
/* This script is loaded by main_ui.xul, so we have access to the window. */
        proceed = Prompts.confirm (window, "Confirm Load Ruleset", message);
    }
    if (proceed == true) {
/* Get the ruleset folder from the preferences. */
        var path = BookmarkSorter.PreferenceUtils.get_ruleset_folder_pref_value ();
/* This script is loaded by main_ui.xul, so we have access to the window. */
/* Ask the user to select a file. */
        var result = BookmarkSorter.File.getReadFile (window, path, "Ruleset Files", "ruleset");
/* If the user selected a file... */
        if (result != null) {
/* Read the file. */
            var promise = BookmarkSorter.File.readFile (result.file);
/* Load the ruleset from the file. */
            promise.then (_.partial (load_ruleset, result.path)).catch (
/* We cannot propagate an exception outside of a promise. We would use Promise.done, but it is not implemented. So we handle the exception here. Unfortunately this means execution continues outside this promise, which we might not want. */
                function (error) { BookmarkSorter.Consts.show_error (error); }
            );
        }
    }
}

/* Handle the save ruleset button click event. Return unit. */
function save_ruleset_click_handler_helper () {
/* Get the ruleset folder from the preferences. */
    var path = BookmarkSorter.PreferenceUtils.get_ruleset_folder_pref_value ();
/* This script is loaded by main_ui.xul, so we have access to the window. */
/* Ask the user to select a file. */
    var result = BookmarkSorter.File.getWriteFile (window, path, "", "Ruleset Files", "ruleset");
/* If the user selected a file... */
    if (result != null) {
/* Get the rules from the tree. */
        var rules = get_rules_from_tree ();
/* Write the rules to the file. */
        var output = JSON.stringify (rules);
        BookmarkSorter.File.writeFile (output, result.file);
/* Clear the ruleset changed flag. */
        _ruleset_changed = false;
/* Save the path to the preferences. */
        if (result.path != null) {
            BookmarkSorter.PreferenceUtils.set_ruleset_folder_pref_value (result.path);
        }
    }
}

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/prefpane
*/
/* Handle the preferences button click event. Return unit. */
function preferences_click_handler_helper () {
/* According to the docs.
"When opening a dialog with multiple panes you must include the toolbar feature in the call to openDialog."
*/
    var dialog = openDialog (BookmarkSorter.Consts.content_folder + 'preferences.xul', '', 'centerscreen, chrome, dialog, modal, toolbar=yes', null);
    dialog.focus();
}

/* Handle the move button click event. Return unit. */
function move_click_handler_helper () {
/* Whether to log the moved tabs. */
    var log_moved_tabs = BookmarkSorter.PreferenceUtils.get_log_moved_tabs_pref_value ();
/* Move the tabs that are set to be moved. */
    var log_string = move_tabs (log_moved_tabs);
/* If the user wants to log moved tabs, and the log string is not empty, write the log string to the log. */
    if (log_moved_tabs == true && log_string.length > 0) {
        log_string = sprintf ("%s%s", "Moved tabs.", log_string);
        BookmarkSorter.Consts.log (log_string);
    }
/* If the user clicks the move button while we are showing search results, init_tabs and its helpers will find no selected tab group, and will clear the current tabs and the tab user interface. We considered calling tab_search_click_handler_helper to repopulate the tab user interface. However, clearing the tab user interface gives the user a visual indication that the tabs have been moved. */
/* Reload the tabs for the currently selected tab group. */
    init_tabs ();
}

/* Functions: event handler: bookmarks. */

/* When we add a new bookmark folder, Firefox first adds the bookmark folder with the title "New Folder", then renames the bookmark folder to the name we entered. So we must handle both the bookmark folder added and changed events.
*/
/* Previously, bookmark_utils.jsm contained a get_bookmark_folder_path_by_id function. We called it in bookmark_folder_added_handler to get the path of the new bookmark folder. It tried to calculate the path of the specified bookmark folder as follows.
1. Get the bookmark folder node with the same ID as the specified bookmark folder.
2. Add the node title to the path.
3. Get the parent node and repeat.
4. Stop when the node is the bookmarks root folder node.
However, this did not work. See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsINavHistoryResultNode
The parent attribute "identifies the parent result node in the result set. The value is null for top level nodes."
So a bookmark folder node has no parent node unless it is part of a query result that also includes the parent node. So to calculate the path of a given node, we need a query result that includes all nodes up to the bookmarks root folder. So we must call BookmarkUtils.get_all_bookmark_folders. So it is simpler to just reset the current tab groups and tab group user interface. */
/* Handle the bookmark folder added event. */
function bookmark_folder_added_handler () {
    init_tab_groups (BookmarkSorter.BookmarkUtils.get_all_bookmark_folders ());
}

/* TODO2 Note session tab group and bookmark folder IDs might conflict, as might session tab and bookmark IDs.
So tab objects might also need a flag to identify them as session tab or bookmark.
Also, functions like bookmark_added_handler present a problem, what if the bookmark has a parent ID that also happens to be a session tab group ID? We can't use find on the two types of IDs interchangeably.
Also, functions like get_tabs_in_selected_tab_groups have to distinguish the IDs.
What we should maybe do is show sessions, or bookmarks, but not both at once.
*/

/* Handle the bookmark added event. Return unit. */
function bookmark_added_handler (parent_id) {
/* If we are showing tab search results, repeat the search. */
    if (_tab_search_mode == true) {
        tab_search_click_handler_helper ();
    }
/* If we are not showing tab search results, see if the bookmark was added to the currently selected tab group, and if so, reload the current tabs. */
    else {
        init_tabs_if_tab_group_is_selected (parent_id);
    }
}

/* Handle the bookmark folder changed event. Return unit. */
function bookmark_folder_changed_handler () {
    init_tab_groups (BookmarkSorter.BookmarkUtils.get_all_bookmark_folders ());
}

/* Handle the bookmark changed event. Return unit. */
function bookmark_changed_handler (parent_id) {
/* If we are showing tab search results, repeat the search. */
    if (_tab_search_mode == true) {
        tab_search_click_handler_helper ();
    }
/* If we are not showing tab search results, see if the bookmark that was changed belongs to the currently selected tab group, and if so, reload the current tabs. */
    else {
        init_tabs_if_tab_group_is_selected (parent_id);
    }
}

/* Note if the user moves a bookmark folder, its ID does not change. So the bookmarks in that folder still have the same bookmark folder ID. They do not store their path. */
/* Handle the bookmark folder moved event. Return unit. */
function bookmark_folder_moved_handler () {
    init_tab_groups (BookmarkSorter.BookmarkUtils.get_all_bookmark_folders ());
}

/* Handle the bookmark moved event. Return unit. */
function bookmark_moved_handler (old_parent_id, new_parent_id) {
/* If we are showing tab search results, repeat the search. */
    if (_tab_search_mode == true) {
        tab_search_click_handler_helper ();
    }
/* If we are not showing tab search results, see if the bookmark was moved to or from the currently selected tab group, and if so, reload the current tabs. */
    else {
/* A bookmark cannot be moved from and to the same tab group, so we expect that at most one of these tab groups is selected. */
        init_tabs_if_tab_group_is_selected (old_parent_id);
        init_tabs_if_tab_group_is_selected (new_parent_id);
    }
}

/* Handle the bookmark folder removed event. Return unit. */
function bookmark_folder_removed_handler (folder_id) {
    init_tab_groups (BookmarkSorter.BookmarkUtils.get_all_bookmark_folders ());
/* If any rules have this folder as a destination tab group, set them to have an invalid destination instead. See the note at the top of this file. */
    update_rules_deleted_tab_group (folder_id);
}

/* Handle the bookmark removed event. Return unit. */
function bookmark_removed_handler (parent_id) {
/* If we are showing tab search results, repeat the search. */
    if (_tab_search_mode == true) {
        tab_search_click_handler_helper ();
    }
/* If we are not showing tab search results, see if the bookmark was removed from the currently selected tab group, and if so, reload the current tabs. */
    else {
        init_tabs_if_tab_group_is_selected (parent_id);
    }
}

/* See:
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Bookmarks (Observing changes to bookmarks and tags)
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsINavBookmarkObserver
*/
/* onItem* functions are called for both bookmarks and bookmark folders. The nsINavBookmarkObserver interface has onFolder* functions, but they are obsolete.
We do not seem to need to implement the handlers we do not use. */
/* Adds event handlers for bookmarks. */
var _bookmark_observer = {
/* Start observing bookmark changes. Return unit. */
    add_observer : function () {
/* (3) True to hold a weak reference to the observer; false to hold a strong reference. */
        Bookmarks.addObserver (this, false);
    },
/* Stop observing bookmark changes. Return unit. */
    remove_observer : function () {
        Bookmarks.removeObserver (this);
    },
/* We do not need to handle batch updates specifically. See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsINavBookmarkObserver (onBeginUpdateBatch)
"Other notifications will be sent during the batch change." */
    onItemAdded : function (aItemId, aParentId, aIndex, aItemType, aURI, aTitle, aDateAdded, aGUID, aParentGUID) {
        if (aItemType == Bookmarks.TYPE_FOLDER) { bookmark_folder_added_handler (); }
        else if (aItemType == Bookmarks.TYPE_BOOKMARK) { bookmark_added_handler (aParentId); }
    },
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsINavBookmarkObserver (onItemChanged)
*/
    onItemChanged : function (aItemId, aProperty, aIsAnnotationProperty, aNewValue, aLastModified, aItemType, aParentId, aGUID, aParentGUID) {
/* We are only interested in the title and uri properties. */
        if (aProperty == "title" || aProperty == "uri") {
            if (aItemType == Bookmarks.TYPE_FOLDER) { bookmark_folder_changed_handler (); }
            else if (aItemType == Bookmarks.TYPE_BOOKMARK) { bookmark_changed_handler (aParentId); }
        }
    },
    onItemMoved : function (aItemId, aOldParentId, aOldIndex, aNewParentId, aNewIndex, aItemType, aGUID, aOldParentGUID, aNewParentGUID) {
        if (aItemType == Bookmarks.TYPE_FOLDER) { bookmark_folder_moved_handler (); }
/* Reset the tabs and tab user interface if the bookmark was moved from or to the currently selected tab group. */
        else if (aItemType == Bookmarks.TYPE_BOOKMARK) { bookmark_moved_handler (aOldParentId, aNewParentId); }
    },
    onItemRemoved : function (aItemId, aParentId, aIndex, aItemType, aURI, aGUID, aParentGUID) {
        if (aItemType == Bookmarks.TYPE_FOLDER) { bookmark_folder_removed_handler (aItemId); }
        else if (aItemType == Bookmarks.TYPE_BOOKMARK) { bookmark_removed_handler (aParentId); }
    },
    QueryInterface : XPCOMUtils.generateQI ([Components.interfaces.nsINavBookmarkObserver]),
};

/* Functions: event handler helper: window load and unload. */

/* Get the user's keyboard shortcuts from the preferences. Return unit. */
function get_keyboard_shortcuts () {
    var value = "";
    try {
        value = BookmarkSorter.PreferenceUtils.get_keyboard_shortcuts_pref_value ();
        if (value.length > 0) {
            _keyboard_shortcuts = JSON.parse (value);
        }
    }
    catch (error) {
        throw new Error (sprintf ("Failed to read keyboard shortcuts preference value. Value: %s. Error: %s.", value, error.message));
    }
}

/* Save the user's keyboard shortcuts to the preferences. Return unit. */
function set_keyboard_shortcuts () {
    var value = "";
/* Save the user's keyboard shortcuts. */
    try {
        value = JSON.stringify (_keyboard_shortcuts);
        BookmarkSorter.PreferenceUtils.set_keyboard_shortcuts_pref_value (value);
    }
    catch (error) {
        throw new Error (sprintf ("Failed to write keyboard shortcuts preference value. Value: %s. Error: %s.", value, error.message));
    }
}

/* Note document.getElementById does not work until the window has loaded. */
/* Handle the window load event. Return unit. */
function load_handler_helper () {
/* Initialize the member values. */
/* This script is loaded by main_ui.xul, so we have access to the document. */
    _tab_groups_list = document.getElementById ("tab_groups");
    _tab_search_text = document.getElementById ("tab_search_text");
    _tab_search_is_regex = document.getElementById ("tab_search_is_regex");
    _tab_search_match_case = document.getElementById ("tab_search_match_case");
    _tab_search_match_title = document.getElementById ("tab_search_match_title");
    _tab_search_match_url = document.getElementById ("tab_search_match_url");
    _tabs_tree = document.getElementById ("tabs_tree");
    _tab_title_column = _tabs_tree.columns.getColumnAt (0);
    _tab_override_column = _tabs_tree.columns.getColumnAt (1);
    _tab_destination_column = _tabs_tree.columns.getColumnAt (2);
    _tab_rows = document.getElementById ("tab_rows");
    _rules_tree = document.getElementById ("rules_tree");
    _rule_text_column = _rules_tree.columns.getColumnAt (0);
    _rule_is_regex_column = _rules_tree.columns.getColumnAt (1);
    _rule_match_case_column = _rules_tree.columns.getColumnAt (2);
    _rule_match_title_column = _rules_tree.columns.getColumnAt (3);
    _rule_match_url_column = _rules_tree.columns.getColumnAt (4);
    _rule_destination_column = _rules_tree.columns.getColumnAt (5);
    _rule_rows = document.getElementById ("rule_rows");
    _tab_destination = document.getElementById ("tab_destination");
    _rule_destination = document.getElementById ("rule_destination");
    _tab_groups_list_context_menu = document.getElementById ("tab_groups_context_menu");
    _tabs_tree_context_menu = document.getElementById ("tabs_tree_context_menu");
    _rule_text = document.getElementById ("rule_text");
    _rule_is_regex = document.getElementById ("rule_is_regex");
    _rule_match_case = document.getElementById ("rule_match_case");
    _rule_match_title = document.getElementById ("rule_match_title");
    _rule_match_url = document.getElementById ("rule_match_url");
/* Add event handlers for bookmarks. */
    _bookmark_observer.add_observer ();
/* Add event handlers for preferences. */
/* This script is loaded by main_ui.xul, so we have access to the window. */
    BookmarkSorter.PreferenceUtils.load_handler (window);
// TODO2 Maybe we need _tab_groups (as in session tab groups) and _folders member values, one of which we then pass to the helper functions?
/* Add the bookmark folders to the current tab groups and the user interface. */
    init_tab_groups (BookmarkSorter.BookmarkUtils.get_all_bookmark_folders ());
/* Maximize the window. */
    window.moveTo (0, 0);
	window.resizeTo (screen.availWidth, screen.availHeight);
/* Get the user's keyboard shortcuts. We do this last so it does not interrupt initialization if it raises an exception. */
    get_keyboard_shortcuts ();
}

/* We tried to use the beforeunload event. See:
https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload
https://developer.mozilla.org/en-US/docs/WindowEventHandlers.onbeforeunload
However, Firefox did not call the event handler. Note the following.

1. unload is listed as a XUL event, but not beforeunload. See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Events

2. beforeunload does not let you specify the message to show to the user. See:
https://developer.mozilla.org/en-US/docs/WindowEventHandlers.onbeforeunload
"Note that in Firefox 4 and later the returned string is not displayed to the user."

3. beforeunload does not let you show an alert. See:
https://developer.mozilla.org/en-US/docs/WindowEventHandlers.onbeforeunload
"Since 25 May 2011, the HTML5 specification states that calls to window.showModalDialog(), window.alert(), window.confirm(), and window.prompt() methods may be ignored during this event."
*/
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Events
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Events/close_event
"Note that the close event is only fired when the user presses the close button on the titlebar; (i.e. not File -> Quit). The unload event should be used to capture all attempts to unload the window."
However, we cannot use the unload event to prevent the window from closing. See:
https://developer.mozilla.org/en-US/docs/Web/Events/unload
*/
/* Handle the window close event. Return unit. */
function close_handler_helper (event) {
/* True to proceed with closing the application. */
    var proceed = true;
/* If the ruleset has changed since it was loaded or last saved, verify that the user wants to proceed. */
    if (_ruleset_changed == true) {
        var message = "The current ruleset has changed since you loaded it or last saved it. Are you sure you want to close Bookmark Sorter?";
/* This script is loaded by main_ui.xul, so we have access to the window. */
        proceed = Prompts.confirm (window, "Confirm Close", message);
        if (proceed == false) {
            event.preventDefault ();
        }
    }
/* Previously, we did this in unload_handler_helper, but it failed silently there. */
    if (proceed == true) {
/* Save the user's keyboard shortcuts. */
        set_keyboard_shortcuts ();
    }
}

/* Handle the window unload event. Return unit. */
function unload_handler_helper () {
/* Remove event handlers for bookmarks. */
    _bookmark_observer.remove_observer ();
/* Remove event handlers for preferences. */
    BookmarkSorter.PreferenceUtils.unload_handler ();
}

/* Functions: event handler: window load and unload. */

/* Handle the window load event. Return unit. */
function load_handler () {
	try { load_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the window close event. (1) The event. Return unit. */
function close_handler (event) {
	try { close_handler_helper (event); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the window unload event. Return unit. */
function unload_handler () {
	try { unload_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the select event for the tab group list. Return unit. */
function tab_group_select_handler () {
	try { tab_group_select_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the tab search button. Return unit. */
function tab_search_click_handler () {
    try { tab_search_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the select event for the tab tree. Return unit. */
function tab_select_handler () {
	try { tab_select_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Note we do not wrap tab_mouse_move_handler in a try/catch block, as the tab mouse move event can fire very frequently. */

/* Handle the mouse double click event for the tab tree. Return unit. */
function tab_mouse_double_click_handler (event) {
	try { tab_mouse_double_click_handler_helper (event); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the key down event for the tab tree. Return unit. */
function tab_key_down_handler (event) {
	try { tab_key_down_handler_helper (event); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the select event for the tab destination menu list. Return unit. */
function tab_destination_select_handler () {
	try { tab_destination_select_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the select event for the rule tree. Return unit. */
function rule_select_handler () {
	try { rule_select_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the select event for the rule destination menu list.. Return unit. */
function rule_destination_select_handler () {
	try { rule_destination_select_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the add rule button. Return unit. */
function add_rule_click_handler () {
	try { add_rule_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the save rule button. Return unit. */
function save_rule_click_handler () {
	try { save_rule_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the delete rule button. Return unit. */
function delete_rule_click_handler () {
	try { delete_rule_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the move rule up button. Return unit. */
function move_rule_up_click_handler () {
	try { move_rule_up_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the move rule down button. Return unit. */
function move_rule_down_click_handler () {
	try { move_rule_down_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the load ruleset button. Return unit. */
function load_ruleset_click_handler () {
	try { load_ruleset_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the save ruleset button. Return unit. */
function save_ruleset_click_handler () {
	try { save_ruleset_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the preferences button. Return unit. */
function preferences_click_handler () {
	try { preferences_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

/* Handle the click event for the move button. Return unit. */
function move_click_handler () {
	try { move_click_handler_helper (); }
	catch (error) { BookmarkSorter.Consts.show_error (error); }
}

// TODO1 Move bookmark unit test helpers from export_session_utils.jsm to bookmark_utils.jsm.

/* Functions: test. */