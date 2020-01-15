const $ = require('jquery');

var scannerReady = false;
var connectionRetries = 0;

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    var wsImpl = window.WebSocket || window.MozWebSocket;

    function connectWebsocket() {
        window.ws = new wsImpl('ws://localhost:8181/');
        ws.onopen = function () {
            console.log("Websocket connected.");
            connectionRetries = 0;
            setTimeout(initializeScanner, 2000);
        };
        ws.onclose = function () {
            ws = null;
            if (scannerReady) {
                console.log("Websocket connection closed.");
                setScannerReady(false);
            }
            if (connectionRetries < 10) {
                console.log('Retrying after 5 seconds...');
            } else {
                console.log('Could not reconnect to scanner service, giving up.');
                $('#scanner-select').html('<option>No scanners found</option>');
                clearInterval(checkInterval);
            }
        };
        ws.onerror = function(evt) {
            if (ws.readyState == 1) {
                console.log('WebSocket Error: ' + evt.type);
            }
        };
        ws.onmessage = function (e) {
            console.log("Received websocket message: "+e.data);
            if (typeof e.data === "string") {
                $('#scanner-select').html(e.data);
                setScannerReady(true);
            }
            else if (e.data instanceof ArrayBuffer) {
                //IF Received Data is ArrayBuffer
            }
            else if (e.data instanceof Blob) {
                i++;
                var f = e.data;
                f.name = "File" + i;
                storedFiles.push(f);
                var reader = new FileReader();
                reader.onload = function (e) {
                    var html = "<div class=\"col-sm-2 text-center\" style=\"border: 1px solid black; margin-left: 2px;\"><img height=\"200px\" width=\"200px\" src=\"" + e.target.result + "\" data-file='" + f.name + "' class='selFile' title='Click to remove'><br/>" + i + "</div>";
                    selDiv.append(html);
                }
                reader.readAsDataURL(f);
            }
        };
    }

    function checkConnection() {
        if(!ws || ws.readyState == 3) {
            connectionRetries++;
            console.log('Reconnect Attempt #'+connectionRetries);
            connectWebsocket();
        }
    }

    connectWebsocket();

    // setInterval will keep checking the connection every 5 seconds
    var checkInterval = setInterval(checkConnection, 5000);
});

function initializeScanner() {
    if (ws) {
        ws.send("GetScannerList");
    }
}

function setScannerReady(status) {
    scannerReady = status;
    if (scannerReady) {
        $('#scan-button').prop('disabled', false);
    } else {
        $('#scan-button').prop('disabled', true);
        $('#scanner-select').html('<option>Detecting...</option>');
    }
}

$(document).on('click', '#scan-button', function(e) {
    ws.send("StartScan");
});
