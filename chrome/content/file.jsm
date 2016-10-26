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
var EXPORTED_SYMBOLS = ["File"];

/* See:
https://developer.mozilla.org/en-US/docs/Components.utils.import
It seems the convention is that a .jsm module exports a variable with the same name as the module (for example, XPCOMUtils).
We use these modules and services at startup, so we import them with Components.utils.import and Components.classes instead of XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter. */
/* Firefox modules. */
Components.utils.import ("resource://gre/modules/XPCOMUtils.jsm");
/* For some reason, if we import this with defineLazyModuleGetter, the Firefox open menu button does not work. */
Components.utils.import ("resource://gre/modules/Promise.jsm");
/* BookmarkSorter modules. We import these into the BookmarkSorter namespace, instead of the default this namespace. */
Components.utils.import ("chrome://BookmarkSorter/content/consts.jsm", BookmarkSorter);

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/mozIJSSubScriptLoader
*/
var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
	.getService(Components.interfaces.mozIJSSubScriptLoader);
/* Include Underscore. */
scriptLoader.loadSubScript (BookmarkSorter.Consts.content_folder + "underscore-min.js");
/* Include sprintf. */
scriptLoader.loadSubScript (BookmarkSorter.Consts.content_folder + "sprintf.min.js");

/* See:
https://developer.mozilla.org/en-US/Add-ons/Performance_best_practices_in_extensions
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/XPCOMUtils.jsm
We don't use these modules and services at startup, so we import them with XPCOMUtils.defineLazyModuleGetter and defineLazyServiceGetter instead of Components.utils.import and Components.classes.
Note the name parameter must match an exported symbol from the module.
*/
/* Firefox services. */
XPCOMUtils.defineLazyServiceGetter (this, "WM", "@mozilla.org/appshell/window-mediator;1", Components.interfaces.nsIWindowMediator);
/* Firefox modules. */
XPCOMUtils.defineLazyModuleGetter (this, "FileUtils", "resource://gre/modules/FileUtils.jsm");
XPCOMUtils.defineLazyModuleGetter (this, "NetUtil", "resource://gre/modules/NetUtil.jsm");

/* The file dialog interface. */
const nsIFilePicker = Components.interfaces.nsIFilePicker;

/* This is for writing files in UTF-8 format. */
var outputConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
	.createInstance (Components.interfaces.nsIScriptableUnicodeConverter);
outputConverter.charset = "UTF-8";

// TODO1 Update file.jsm in SessionExporter to match this.

/* Functions: general helper. */

/* Return a folder object for path (1). */
function path_to_folder (path) {
/* If the path is not empty... */
	if (path.length > 0) {
		try {
/* Create a file object to represent the folder. */
			var folder = new FileUtils.File (path);
/* If the folder does not exist, create it. nsIFile.create requires UNIX-style permissions, but using an octal literal raises an exception. */
			if (folder.exists () == false) {
                folder.create (Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt ("0777", 8));
            }
			return folder;
		}
		catch (error) {
			throw new Error (sprintf ("file.jsm: path_to_folder: Error creating folder object. Folder: %s. Error: %s.", path, error.message));
		}
    }
}

/* Functions: methods. */

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Open_and_Save_Dialogs
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsILocalFile
*/
var File = {
/* Show the Select File dialog. (1) The window with which to open the dialog. (2) The default path for the dialog. (3) The filter description for the dialog. (4) The filter for the dialog. If the user selects a file, return it; otherwise, return null. */
	getReadFile : function (window, default_path, filter_description, filter) {
		var file_dialog =
			Components.classes["@mozilla.org/filepicker;1"]
			.createInstance (nsIFilePicker);
		file_dialog.init (window, "Select File", nsIFilePicker.modeOpen);
/* If the default path is not empty, set the default path for the dialog. */
        if (default_path.length > 0) {
            file_dialog.displayDirectory = path_to_folder (default_path);
        }
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker (appendFilter)
Based on the examples, it seems that unlike defaultExtension, the filter should include the wildcard and dot. */
/* If the user specified a filter, set the dialog to show only files that match the filter. */
        if (filter_description.length > 0 && filter.length > 0) {
		    file_dialog.appendFilter (filter_description, "*." + filter);
        }
/* If the user selects a file... */
		if (file_dialog.show () == nsIFilePicker.returnOK) {
/* Return the path and the selected file. */
			return {
                path : file_dialog.displayDirectory.path,
                file : file_dialog.file,
            };
		}
/* Otherwise, return null. */
		else { return null; }
	},

/* Return true if string (1) ends with suffix (2); otherwise, return false. */
	endsWith : function (str, suffix) {
		var startIndex = str.length - suffix.length;
		if (startIndex < 0) { return false; }
		else { return str.indexOf (suffix, startIndex) != -1; }
	},

/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Open_and_Save_Dialogs
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsILocalFile
*/
/* Show the Select Output File dialog. (1) The window with which to open the dialog. (2) The default path for the dialog. (3) The default file name, including extension, for the dialog. (4) The filter description for the dialog. (5) The filter for the dialog. If the user selects an output file, return it; otherwise, return null. */
	getWriteFile : function (window, default_path, defaultFileName, filter_description, filter) {
		var file_dialog =
			Components.classes["@mozilla.org/filepicker;1"]
			.createInstance (nsIFilePicker);
		file_dialog.init (window, "Select Output File", nsIFilePicker.modeSave);
/* If the default path is not empty, set the default path for the dialog. */
        if (default_path.length > 0) {
            file_dialog.displayDirectory = path_to_folder (default_path);
        }
/* Set the default file name for the dialog. */
		file_dialog.defaultString = defaultFileName;
/* If the user specified a filter, set the dialog to show only files that match the filter. */
        if (filter_description.length > 0 && filter.length > 0) {
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker (appendFilter)
Based on the examples, it seems that unlike defaultExtension, the filter should include the wildcard and dot. */
		    file_dialog.appendFilter (filter_description, "*." + filter);
/* See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFilePicker (defaultExtension)
"Specify [the filter] without a leading dot, for example "jpg"." */
            file_dialog.defaultExtension = filter;
        }
/* If the user selects a file... */
		var result = file_dialog.show ();
		if (result == nsIFilePicker.returnOK || result == nsIFilePicker.returnReplace) {
/* TODO2 Validate file name. */
			var file = file_dialog.file;
/* Return the path and the file. See:
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFile
"The parent will be null when this nsIFile references the top of the volume. For example, C:\ does not have a parent. Read only." 
*/
            var parent = file.parent;
            var path = null;
            if (parent != null) {
                path = parent.path;
            }
			return {
                path : path,
                file : file,
            };
		}
/* Otherwise, return null. */
		else { return null; }
	},

/* See:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Promise
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIInputStream
*/
/* Read the file (1). Return a promise whose value contains an object. (R1) The text of the file. (R2) The last modified date of the file. */
    readFile : function (file) {
/* We must use Promise.defer here because we cannot return Promise.resolve from NetUtil.asyncFetch. */
		var deferred = Promise.defer ();
        try {
		    NetUtil.asyncFetch (file, function (inputStream, status) {
/* If we succeed in reading the file, resolve the promise. */
			    if (Components.isSuccessCode (status) == true) {
/* Include both the file contents and the last modified date of the file. */
				    deferred.resolve ({
                        contents : NetUtil.readInputStreamToString (inputStream, inputStream.available ()),
                        date : file.lastModifiedDate,
                    });
			    }
/* If we fail to read the file, raise an exception. */
			    else {
/* This is caught by an outer exception handling block, so we provide the remaining information there. */
                    throw new Error (sprintf ("Failed to read file. Status: %s.", status));
                }
/* Documentation does not say whether NetUtil.asyncFetch or NetUtil.readInputStreamToString automatically closes the stream. However, per nsIInputStream documentation, we can call close more than once. */
			    inputStream.close ();
		    });
        }
        catch (error) {
            throw new Error (sprintf ("file.jsm: readFiles: Error reading file. File: %s. Error: %s.", file.path, error.message));
        }
		return deferred.promise;
    },

/* Read the files (1). Return an array of promises whose values contain the text of the files. */
	readFiles : function (files) {
/* Map the files to promises. */
        return _.map (files, File.readFile);
	},

/* See:
https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/FileUtils.jsm
https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIOutputStream
https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/NetUtil.jsm
*/
/* Write the tab data (1) to file (2). Return unit. */
	writeFile : function (data, file) {
/* The default flags are:
FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE
*/
		var outputStream = FileUtils.openSafeFileOutputStream (file);
		var inputStream = outputConverter.convertToInputStream (data);
/* Per NetUtil.jsm documentation, both streams are automatically closed when the copy completes. Per nsIOutputStream documentation, closing the output stream flushes it. */
		NetUtil.asyncCopy (inputStream, outputStream, function (status) {
			if (!Components.isSuccessCode (status)) {
				throw new Error (sprintf ("file.jsm: writeFile: Error writing output file. File: %s. Status: %s.", file_path, status));
			}
		});	
	},
};