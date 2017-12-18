/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function () {
    "use strict";

    var client,             // Connection to the Azure Mobile App backend
        todoItemTable,      // Reference to a table endpoint on backend
        fontfinderTable;

    var fonts = [
        "Inconsolata",
        "Lora",
        "Montserrat",
        "Open Sans",
        "Oswald",
        "Raleway",
        "Roboto",
        "Roboto Condensed",
        "Slabo",
        "Source Sans Pro"
    ];

    // Add an event listener to call our initialization routine when the host is ready
    document.addEventListener('deviceready', onDeviceReady, false);

    /**
     * Event Handler, called when the host is ready
     *
     * @event
     */
    function onDeviceReady() {
        // Create a connection reference to our Azure Mobile Apps backend
        client = new WindowsAzure.MobileServiceClient('https://fontfinder.azurewebsites.net');

        // Create a table reference
        todoItemTable = client.getTable('todoitem');
        fontfinderTable = client.getTable('fontresultitem');

        // Refresh the todoItems
        refreshDisplay();

        // Wire up the UI Event Handler for the Add Item
        //$('#add-item').submit(addItemHandler);
        $('#select-picture').on('click', selectPictureHandler);
        $('#take-picture').on('click', takePictureHandler);
        $('#refresh').on('click', refreshDisplay);
        $('.dropbtn').on('click', myFunction);
        
    }

    /* When the user clicks on the button, 
        toggle between hiding and showing the dropdown content */
    function myFunction() {
        document.getElementById("myDropdown").classList.toggle("show");
    }

    /**
     * Refresh the items within the page
     */
    function refreshDisplay() {
        updateSummaryMessage('Loading Data from Azure');

        fontfinderTable
            //.where({ complete: false })     // Set up the query
            .read()                         // Read the results
            .then(createFontItemList, handleError);

        $('#errorlog').html($('<ul id="errorlog">'))
    }

    /**
     * Updates the Summary Message
     * @param {string} msg the message to use
     * @returns {void}
     */
    function updateSummaryMessage(msg) {
        $('#summary').html(msg);
    }

    function parseInputResult(result) {
        var resultString = "";

        try {
            var res = result.split(";");

            for (var i=0; i<res.length; i++) {
                resultString += "<li> " + res[i] + " </li>";
            }

            return resultString;
        }
        catch (err) {
            handleError(err);
        }
    }

    /**
     * Create the DOM for a single todo item
     * @param {Object} item the Todo Item
     * @param {string} item.id the ID of the item
     * @param {bool} item.complete true if the item is completed
     * @param {string} item.text the text value
     * @returns {jQuery} jQuery DOM object
     */
    function createFontItem(item) {
        var resultTxt = parseInputResult(item.fontResult);


        //var resultString = "<p> Results for each font: <br><br>";
        /*
        for (var font in result) {
            var resultValue = result[font];
            resultString += font + ": " + resultValue + "% <br>"
        }
        resultString += "</p>"
        */

        return $('<li class="result">')
            .attr('data-fontitem-id', item.id)
            .html('<p>' + 'Detected glyphs: <br\>' + item.textResult + '</p>' +
            '<p>' + 'No. glphs: ' + item.charCount + '</p>' +
            '<div class="center">' +
            '<div class="dropdown">' +
            '<button class="dropbtn" id="dropdown">Show fonts</button>' +
            '<ol id="myDropdown" class="dropdown-content">' +
            resultTxt +
            '</ol></div></div>'
            );

        //.append($('<button class="item-delete">Delete</button>'))
        //.append($('<input type="checkbox" class="item-complete">').prop('checked', item.complete))
        //.append($('<div>').append($('<input class="item-text">').val(item.textResult)));
    }


    /**
     * Create a list of Todo Items
     * @param {TodoItem[]} items an array of todoitem objects
     * @returns {void}
     */
    function createFontItemList(items) {
        // Cycle through each item received from Azure and add items to the item list
        var listItems = $.map(items, createFontItem);
        $('#font-items').empty().append(listItems).toggle(listItems.length > 0);
        $('#summary').html('<strong>' + items.length + '</strong> item(s)');

        // Wire up the event handlers for each item in the list
        //$('.item-delete').on('click', deleteItemHandler);
        //$('.item-text').on('change', updateItemTextHandler);
        //$('.item-complete').on('change', updateItemCompleteHandler);
    }


    /**
     * Handle error conditions
     * @param {Error} error the error that needs handling
     * @returns {void}
     */
    function handleError(error) {
        var text = error + (error.request ? ' - ' + error.request.status : '');
        console.error(text);
        $('#errorlog').append($('<li>').text(text));
    }

    /**
     * Given a sub-element of an LI, find the TodoItem ID associated with the list member
     *
     * @param {DOMElement} el the form element
     * @returns {string} the ID of the TodoItem
     */
    function getTodoItemId(el) {
        return $(el).closest('li').attr('data-todoitem-id');
    }

    /******************************************************
        // Begin upload images to Azure Mobile Services additions.
        *********************************************************/
    // This is the new item being inserted.
    var insertedItem;

    function takePictureHandler(event) {
        navigator.camera.getPicture(onSuccess, onFail, {
            quality: 100,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.CAMERA,
            saveToPhotoAlbum: true,
            correctOrientation: true
        });

        function onSuccess(imageURI) {
            var newItem = {};
            newItem.containerName = "uploaded-images";
            newItem.resourceName = imageURI.replace(/^.*[\\\/]/, '');
            $('#errorlog').append($('<li>').text(newItem.resourceName + " selected, processing..."));

            // Insert the item and upload the blob.
            insertNewItemWithUpload(newItem, imageURI);

        }

        function onFail(message) {
            alert('Failed because: ' + message);
        }
        event.preventDefault();
    }

    function selectPictureHandler(event) {
        navigator.camera.getPicture(onSuccess, onFail, {
            quality: 100,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            correctOrientation: true
        });

        function onSuccess(imageURI) {
            var newItem = {};
            newItem.containerName = "uploaded-images";
            newItem.resourceName = imageURI.replace(/^.*[\\\/]/, '');
            $('#errorlog').append($('<li>').text(newItem.resourceName + " selected, processing..."));

            // Insert the item and upload the blob.
            insertNewItemWithUpload(newItem, imageURI);
        }

        function onFail(message) {
            alert('Failed because: ' + message);
        }
        event.preventDefault();
    }

    // Insert a new item, then also upload a captured image if we have one.
    var insertNewItemWithUpload = function (newItem, capturedFile) {
        $('#errorlog').append($('<li>').text("insertNewItemWithUpload"));
        // Do the insert so that we can get the SAS query string from Blob storage.
        todoItemTable.insert(newItem).then(function (item) {
            $('#errorlog').append($('<li>').text("inserted"));
            // If we have obtained an SAS, then upload the image to Blob storage.
            if (item.sasQueryString !== undefined) {
                insertedItem = item;
                readImage(capturedFile);
                $('#errorlog').append($('<li>').text("Input accepted..."));
            }
        }, handleError).then(handleError);
    }

    // This function is called to get the newly captured image
    // file and read it into an array buffer. 
    function readImage(capturedFile) {
        // Get the URL of the image on the local device.
        //var localFileSytemUrl = capturedFile.fullPath;
        
        /*window.resolveLocalFileSystemURL(capturedFile, function (fileEntry) {
            fileEntry.file(function (file) {*/
                // We need a FileReader to read the captured file.
                var reader = new FileReader();
                reader.onloadend = readCompleted;
                reader.onerror = fail;

                $('#errorlog').append($('<li>').text("reading..."));
                // Read the captured file into a byte array.
                // This function is not currently supported on Windows Phone.
                reader.readAsArrayBuffer(capturedFile);/*
            }, fail);
        });*/
    }

    // This function gets called when the reader is done loading the image
    // and it is sent via an XMLHttpRequest to the Azure Storage Blob service.
    var readCompleted = function (evt) {
        if (evt.target.readyState == FileReader.DONE) {

            $('#errorlog').append($('<li>').text("File prepared, beginning upload..."));
            // The binary data is the result.
            var requestData = evt.target.result;
            var imageUri = "https://functionimagestorage.blob.core.windows.net/" +
                insertedItem.containerName + "/" +
                insertedItem.resourceName;

            console.debug("sasQueryString:" + insertedItem.sasQueryString);
            console.debug("imageUri:" + imageUri);
            // Build the request URI with the SAS, which gives us permissions to upload.
            var uriWithAccess = imageUri + "?" + insertedItem.sasQueryString;
            var xhr = new XMLHttpRequest();
            xhr.onerror = fail;
            xhr.onloadend = uploadCompleted;
            xhr.open("PUT", uriWithAccess);
            xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
            xhr.setRequestHeader('x-ms-blob-content-type', 'image/jpeg');
            xhr.send(requestData);
        }
    }

    // This function is called when the XMLHttpRequest has a response.
    var uploadCompleted = function (r) {
        // Response code is 201 (Created) if success.
        if (r.currentTarget.status === 201) {
            alert("Upload is completed. Image is being processed.");
            console.debug("Upload complete.");
            refreshDisplay();
        }
        else {
            alert("An error occurred during upload.");
            refreshDisplay();
        }
    }

    // Function that handles general errors.
    function fail(err) {
        alert("An error has occurred: " + JSON.stringify(err));
        refreshDisplay();
    }
    /*
    // Handle insert--this replaces the existing handler.
    function addItemHandler(event) {
        var textbox = $('#new-item-text'),
            itemText = textbox.val();
        if (itemText !== '') {
            var newItem = { text: itemText, complete: false };
            // Do the capture before we do the insert. If user cancels, just continue.
            // Launch device camera application, allowing user to capture a single image.                
            navigator.device.capture.captureImage(function (mediaFiles) {
                if (mediaFiles) {
                    // Set a reference to the captured file.
                    var capturedFile = mediaFiles[0];
                    console.debug("capturedFile object: " + JSON.stringify(capturedFile));

                    // Set the properties we need on the inserted item, using the device UUID
                    // to avoid collisions on the server with images from other devices.
                    newItem.containerName = "uploaded-images";
                    newItem.resourceName = capturedFile.name;

                    // Insert the item and upload the blob.
                    insertNewItemWithUpload(newItem, capturedFile);
                }

            }, function () {
                // Insert the item but not the blob.
                insertNewItemWithUpload(newItem, null);
            }, { limit: 1 });
        }
        textbox.val('').focus();
        event.preventDefault();
    }*/
    /******************************************************
    // End upload images to Azure Mobile Services additions.
    *********************************************************/
    /**
     * Event handler for when the user enters some text and clicks on Add
     * @param {Event} event the event that caused the request
     * @returns {void}
     *//*
    function addItemHandler(event) {
        var textbox = $('#new-item-text'),
            itemText = textbox.val();

        updateSummaryMessage('Adding New Item');
        if (itemText !== '') {
            todoItemTable.insert({
                text: itemText,
                complete: false
            }).then(refreshDisplay, handleError);
        }

        textbox.val('').focus();
        event.preventDefault();
    }*/

    /**
     * Event handler for when the user clicks on Delete next to a todo item
     * @param {Event} event the event that caused the request
     * @returns {void}
     */
    /*
    function deleteItemHandler(event) {
        var itemId = getTodoItemId(event.currentTarget);

        updateSummaryMessage('Deleting Item in Azure');
        todoItemTable
            .del({ id: itemId })   // Async send the deletion to backend
            .then(refreshDisplay, handleError); // Update the UI
        event.preventDefault();
    }*/

    /**
     * Event handler for when the user updates the text of a todo item
     * @param {Event} event the event that caused the request
     * @returns {void}
     */
    /*
    function updateItemTextHandler(event) {
        var itemId = getTodoItemId(event.currentTarget),
            newText = $(event.currentTarget).val();

        updateSummaryMessage('Updating Item in Azure');
        todoItemTable
            .update({ id: itemId, text: newText })  // Async send the update to backend
            .then(refreshDisplay, handleError); // Update the UI
        event.preventDefault();
    }*/

    /**
     * Event handler for when the user updates the completed checkbox of a todo item
     * @param {Event} event the event that caused the request
     * @returns {void}
     */
    /*
    function updateItemCompleteHandler(event) {
        var itemId = getTodoItemId(event.currentTarget),
            isComplete = $(event.currentTarget).prop('checked');

        updateSummaryMessage('Updating Item in Azure');
        todoItemTable
            .update({ id: itemId, complete: isComplete })  // Async send the update to backend
            .then(refreshDisplay, handleError);        // Update the UI
    }*/
})();