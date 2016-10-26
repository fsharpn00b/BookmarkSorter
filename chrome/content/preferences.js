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

/* Reset the colorpicker elements. Return unit. */
function reset_click_handler () {
/* For some reason, if we set the color property of a colorpicker elements to an empty string, the corresponding preference is not updated. So we must update the preference directly. */
    document.getElementById ("BookmarkSorter_prefs_default_background_color").value = "";
    document.getElementById ("BookmarkSorter_prefs_default_foreground_color").value = "";
    document.getElementById ("BookmarkSorter_prefs_hover_background_color").value = "";
    document.getElementById ("BookmarkSorter_prefs_hover_foreground_color").value = "";
    document.getElementById ("BookmarkSorter_prefs_selected_background_color").value = "";
    document.getElementById ("BookmarkSorter_prefs_selected_foreground_color").value = "";
}
