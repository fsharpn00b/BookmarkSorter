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

/* Member values. */

/* The key entered by the user. */
var _key = null;

/* According to:
https://developer.mozilla.org/en-US/docs/Web/Events/keyup
keyup.key is unimplemented. However, according to:
https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
charcode and keycode are deprecated and we should use key instead, if available.
Also see:
https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key
*/
/* Handle the key up event. Return unit. */
function key_up_handler (event) {
    var key_text = document.getElementById ("key");
/* Get the key the user pressed. */
    var key = event.key;
/* According to:
https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key
"If the event is caused by a dead key press, the key value must be "Dead". ... If there is no proper name for the key, the value must be "Unidentified"." */
    if (key == "Dead" || key == "Unidentified") {
        window.alert ("That key is dead or could not be identified.");
    }
/* Ignore modifier and OS keys. */
    else if (key == "Esc" ||
        key == "Escape" ||
        key == "Tab" ||
        key == "Enter" ||
        key == "Shift" ||
        key == "Control" ||
        key == "Alt" ||
        key == "Fn" ||
        key == "Win" ||
/* The Win key translates to "OS" on other browsers than IE. */
        key == "OS" ||
/* The Command key on a Mac translates to "Meta". */
        key == "Meta") {
    }
    else {
        _key = key;
/* If the key is Space, set the label to that so the user can see it. */
        if (key == " ") {
            key_text.value = "Space";
        }
        else {
            key_text.value = key;
        }
    }
}

/* Handle the user clicking Ok. If the user entered a key, return true; if not, return false. */
function accept () {
    if (_key == null) {
        window.alert ("Please press a key to use as a keyboard shortcut.");
        return false;
    }
    else {
/* If the user clicks Cancel, this function is never called, and window.arguments[0].out is null. */
        window.arguments[0].out = {
            key : _key,
        };
        return true;
    }
}