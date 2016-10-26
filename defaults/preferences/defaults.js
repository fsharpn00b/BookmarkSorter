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

/* See:
https://developer.mozilla.org/en-US/docs/Default_Preferences
The [preferences] file, despite having .js extension, is not a JavaScript file. You may not set variables inside of it, nor may [you] do any kind of program flow control (ifs, loops etc.) nor even calculated values (i.e. 3600 * 24 * 5). Doing so will cause Mozilla to stop processing your preferences file without any notification, warning, error, or exception. Think of it more as an .ini file. Comments are perfectly acceptable.
*/

/* Note if we need to uninstall and reinstall this extension, be sure to remove or reset the firstRun preference in the following file.
<user>\AppData\Roaming\Mozilla\Firefox\Profiles\<Profile>\prefs.js
*/

/* True if this is the first time the extension has been loaded; otherwise, false. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.firstRun", true);
/* The font size. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.font_size", 12);
/* The default background color. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.default_background_color", "");
/* The default text color. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.default_foreground_color", "");
/* The background color for items the user hovers over. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.hover_background_color", "");
/* The text color for items the user hovers over. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.hover_foreground_color", "");
/* The background color for selected items. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.selected_background_color", "");
/* The text color for selected items. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.selected_foreground_color", "");
/* True to log moved tabs. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.log_moved_tabs", true);
/* The folder where rulesets are saved. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.ruleset_folder", "");
/* The user's keyboard shortcuts. */
pref("extensions.{4966CF83-C4AF-4606-80FE-0BAA4552317B}.keyboard_shortcuts", "");