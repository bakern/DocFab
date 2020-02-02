const $ = require('jquery');
import { addScanPage, finishScan } from './app.js';

var scannerReady = false;
var scanningNow = false;
var scanPage = 0;
var connectionRetries = 0;

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    var wsImpl = window.WebSocket || window.MozWebSocket;

    function connectWebsocket() {
        window.ws = new wsImpl('ws://localhost:8181/');
        ws.onopen = function () {
            console.log("Websocket connected.");
            connectionRetries = 0;
            $('#scan-button').prop('hidden', false);
            $('#connect-scanner-button').prop('hidden', true);
            setTimeout(initializeScanner, 2000);
        };
        ws.onclose = function () {
            //ws = null;
            if (scannerReady) {
                console.log("Websocket connection closed.");
                setScannerReady(false);
            }
            if (connectionRetries < 10) {
                console.log('Retrying after 5 seconds...');
            } else {
                console.log('Could not reconnect to scanner service, giving up.');
                $('#scanner-select').html('<option>No scanners found</option>');
                $('#scan-button').prop('hidden', true);
                $('#connect-scanner-button').prop('hidden', false).prop('disabled', false);
                clearInterval(checkInterval);
            }
        };
        ws.onerror = function(evt) {
            if (ws.readyState == 1) {
                console.log('WebSocket Error: ' + evt.type);
            }
        };
        ws.onmessage = function (e) {
            if (typeof e.data === "string") {
                var message = JSON.parse( e.data );
                console.log("Received websocket message", message);
                if (message.messageType == 'UpdateSources') {
                    console.log("Updating sources...");
                    updateSourceList(message);
                } else if (message.messageType == 'StartScan') {
                    $('#scan-button').prop('hidden', true);
                    $('#stop-scan-button').prop('hidden', false);
                } else if (message.messageType == 'ScanEnd') {
                    $('#scan-button').prop('hidden', false);
                    $('#stop-scan-button').prop('hidden', true);
                    setTimeout(finishScan, 2000);
                }
            }
            else if (e.data instanceof ArrayBuffer) {
                //IF Received Data is ArrayBuffer
                console.log("Received websocket ArrayBuffer message: "+e.data);
            }
            else if (e.data instanceof Blob) {
                scanPage++;
                var file = e.data;
                console.log("Received websocket document: "+file.name);
                addScanPage(file, scanPage);
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

    $(document).on('click', '#connect-scanner-button', function(e) {
        connectionRetries = 0;
        connectWebsocket();
        $('#connect-scanner-button').prop('disabled', true)
        // setInterval will keep checking the connection every 5 seconds
        checkInterval = setInterval(checkConnection, 5000);
    });
});

function initializeScanner() {
    if (ws) {
        console.log('Asking for list of scanners...');
        ws.send("GetScannerList");
    }
}

function updateSourceList(msg) {
    var optionList = '';
    var sources = JSON.parse(msg.sources);
    for (var i = 0; i < sources.length; i++) {
        if (msg.selected && (msg.selected == sources[i])) {
            optionList += '<option selected>'+sources[i]+'</option>';
        } else {
            optionList += '<option>'+sources[i]+'</option>';
        }
    }
    $('#scanner-select').html(optionList);
    setScannerReady(true);
}

function setScannerReady(status) {
    scannerReady = status;
    if (scannerReady) {
        $('#scan-button').prop('disabled', false);
        $('#scanner-select').prop('disabled', false);
    } else {
        $('#scan-button').prop('disabled', true);
        $('#scanner-select').html('<option>Detecting...</option>');
    }
}

$(document).on('click', '#scan-button', function(e) {
    scanPage = 0;
    ws.send("StartScan");
});
$(document).on('click', '#stop-scan-button', function(e) {
    ws.send("StopScan");
});
