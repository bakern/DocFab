require('../css/app.css');

const $ = require('jquery');

// pdf-lib for creating & modifying PDFs
import { PDFDocument, degrees, PageSizes } from 'pdf-lib';

// Mozilla PDF.js for rendering PDFs
import pdfjsLib from 'pdfjs-dist/webpack';

import UIkit from 'uikit';
require('uikit/dist/css/uikit.min.css');
import Icons from 'uikit/dist/js/uikit-icons';
UIkit.use(Icons); // loads the Icon plugin

const Stats = require('stats.js'); // https://github.com/mrdoob/stats.js

// https://github.com/eligrey/FileSaver.js
import { saveAs } from 'file-saver';
var FileSaver = require('file-saver');

// Print.js for printing PDFs easily
import print from 'print-js'

// Store each full PDF globally so they can be modified
var uploadedFiles = [];
var pdflibFiles = [];
var pdfjsFiles = [];
var pdfCount = 0;
var scanPageFiles = [];
var scanPagePdflibFiles = [];
var currentScanFileIndex= null;

/** Memory Stats Section **/
var stats = new Stats();
stats.showPanel( 2 ); // 0: fps, 1: ms, 2: mb, 3+: custom
function animate() {
	stats.begin();
	// monitored code goes here
	stats.end();
	requestAnimationFrame( animate );
}
requestAnimationFrame( animate );
/** End Memory Stats Section **/

/** UIKit Upload Handler **/
// DropZoneJS might be a good alternative
var bar = document.getElementById('js-progressbar');
UIkit.upload('.js-upload', {
    multiple: true,
    allow: '*.pdf',
    mime: 'application/pdf',
    method: false, // Disable the AJAX POST of file, we don't want to submit it
    beforeSend: function (environment) {
        //console.log('beforeSend', arguments);
        // The environment object can still be modified here.
        // var {data, method, headers, xhr, responseType} = environment;
    },
    beforeAll: function (el, files) {
        for (var i = 0; i < files.length; i++) {
            pdfCount++;
            uploadedFiles[pdfCount] = files[i];
            readFile(files[i], pdfCount);
        }
        return false;
    },
    before: function() {
        return false;
    },
    error: function () {
        console.log('error', arguments);
    },
    loadStart: function (e) {
        bar.removeAttribute('hidden');
        bar.max = e.total;
        bar.value = e.loaded;
    },
    progress: function (e) {
        bar.max = e.total;
        bar.value = e.loaded;
    },
    loadEnd: function (e) {
        bar.max = e.total;
        bar.value = e.loaded;
    },
    completeAll: function () {
        setTimeout(function () {
            bar.setAttribute('hidden', 'hidden');
        }, 1000);
    },
    fail: function(e) {
        console.log('failed', e);
        UIkit.notification({message: 'Failed: file is not a proper PDF', status: 'danger'});
    }
});
/** End UIKit Upload Handler **/

/** Handle page moves **/
$(document).on('moved', '.uk-sortable', function(e) {
    console.log("moved", e);
})
/** Lightbox for showing a page full-screen **/
/*$(document).on('show', '.uk-lightbox', function(e) {
    console.log("show", e);
})*/
/** Handle deleting page **/
$(document).on('click', '.delete-page', function(e) {
    $(this).closest('.page-container').fadeOut(400, 'swing', function() { $(this).remove(); });
})
/** Handle copying page **/
$(document).on('click', '.copy-page', function(e) {
    var pageContainer = $(this).closest('.page-container');
    var newPageContainer = pageContainer.clone();

    // Copy the canvas
    var oldCanvas = $(this).closest('.page-container').children('canvas')[0];
    var newCanvas = newPageContainer.children('canvas');
    var newContext = newCanvas[0].getContext('2d');
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;
    newContext.drawImage(oldCanvas, 0, 0);

    newPageContainer.insertAfter( pageContainer );
})
/** Handle deleting file **/
$(document).on('click', '.delete-file', function(e) {
    var fileNumber = $(this).closest('.file-container').attr("data-file-number");
    console.log('Deleting file '+uploadedFiles[fileNumber].name);
    $(this).closest('li.file-container').fadeOut(400, 'swing', function() { $(this).remove(); });
    $('#workspace-file-'+fileNumber).parent().remove();
})
/** Handle saving/downloading file **/
$(document).on('click', '.download-file', function(e) {
    var fileNumber = $(this).closest('.file-container').attr("data-file-number");
    console.log('Preparing file '+uploadedFiles[fileNumber].name+' for download');
    // Find which pages are still there
    var pages = [];
    $('#workspace-file-'+fileNumber).find('canvas').each(function(index) {
        pages[index] = {
            "pageNumber": this.dataset.pageNumber,
            "fileNumber": this.dataset.fileNumber,
            "rotate": this.dataset.rotate
        };
    });
    downloadPdf(fileNumber, pages);
})
async function downloadPdf(fileNumber, pages) {
    // Create new PDF
    var outputPDF = await PDFDocument.create();
    console.log('New PDF will have '+pages.length+' pages');
    for(var i = 1; i <= pages.length; i++) {
        console.log('Adding page '+pages[i-1].pageNumber+' from file '+pages[i-1].fileNumber+' to new PDF as page '+i);
        const [newPage] = await outputPDF.copyPages(pdflibFiles[pages[i-1].fileNumber], [parseInt(pages[i-1].pageNumber, 10)-1]);
        newPage.setRotation(degrees(parseInt(pages[i-1].rotate)));
        outputPDF.addPage(newPage);
    }
    outputPDF.setAuthor('');
    outputPDF.setCreator('DocFab v1.0');
    var outputPdfUri = await outputPDF.saveAsBase64({ dataUri: true});

    FileSaver.saveAs(outputPdfUri, document.getElementById('file-'+fileNumber+'-name').value);
    console.log('Done');
}
/** Handle printing file **/
$(document).on('click', '.print-file', function(e) {
    var fileNumber = $(this).closest('.file-container').attr("data-file-number");
    console.log('Preparing file '+uploadedFiles[fileNumber].name+' for printing');
    // Find which pages are still there
    var pages = [];
    $('#workspace-file-'+fileNumber).find('canvas').each(function(index) {
        pages[index] = {
            "pageNumber": this.dataset.pageNumber,
            "fileNumber": this.dataset.fileNumber,
            "rotate": this.dataset.rotate
        };
    });
    printPdf(fileNumber, pages);
})
async function printPdf(fileNumber, pages) {
    // Create new PDF
    var outputPDF = await PDFDocument.create();
    console.log('New PDF will have '+pages.length+' pages');
    for(var i = 1; i <= pages.length; i++) {
        console.log('Adding page '+pages[i-1].pageNumber+' from file '+pages[i-1].fileNumber+' to new PDF as page '+i);
        const [newPage] = await outputPDF.copyPages(pdflibFiles[pages[i-1].fileNumber], [parseInt(pages[i-1].pageNumber, 10)-1]);
        newPage.setRotation(degrees(parseInt(pages[i-1].rotate)));
        outputPDF.addPage(newPage);
    }
    var outputPdfBase64 = await outputPDF.saveAsBase64();

    printJS({printable: outputPdfBase64, type: 'pdf', base64: true, showModal:true});
    console.log('Done');
}
/** Handle rotating right **/
$(document).on('click', '.rotate-page-right', function(e) {
    // Rotate the canvas and re-draw image
    var canvas = $(this).closest('.page-container').children('canvas')[0];
    // Get current rotation, set new rotation
    var oldRotation = parseInt(canvas.dataset.rotate);
    if (!oldRotation) oldRotation = 0;
    if (oldRotation == 270) oldRotation = -90;
    var newRotation = oldRotation + 90;
    // Rotate the image
    // Either of these methods work.  This first method re-renders the page, which takes more resources (and time) and keeps the margins, which messes up the grid alignment
    var oldWidth = canvas.width;
    var oldHeight = canvas.height;
    canvas.width = oldHeight;
    canvas.height = oldWidth;
    renderPage(pdfjsFiles[parseInt(canvas.dataset.fileNumber)], parseInt(canvas.dataset.pageNumber), canvas, newRotation)
    // This method rotates/transforms the existing canvas, which is quicker and leaves the grid alignment nicer
    //canvas.style.transform = "rotate(" + newRotation + "deg)";
})
/** Handle rotating left **/
$(document).on('click', '.rotate-page-left', function(e) {
    // Rotate the canvas and re-draw image
    var canvas = $(this).closest('.page-container').children('canvas')[0];
    // Get current rotation, set new rotation
    var oldRotation = parseInt(canvas.dataset.rotate);
    if (!oldRotation) oldRotation = 0;
    if (oldRotation == 0) oldRotation = 360;
    var newRotation = oldRotation - 90;
    canvas.dataset.rotate = newRotation;
    // Rotate the image
    var oldWidth = canvas.width;
    var oldHeight = canvas.height;
    canvas.width = oldHeight;
    canvas.height = oldWidth;
    renderPage(pdfjsFiles[parseInt(canvas.dataset.fileNumber)], parseInt(canvas.dataset.pageNumber), canvas, newRotation)
})
/** Handle new file button **/
$(document).on('click', '#new-file-button', function(e) {
    newFile();
})

// Get everything set up once page is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add memory stats box
    $('#stats-wrapper').append(stats.dom);
    $('#stats-wrapper').children().css("left", "").css("right", "0px").css("top", "").css("bottom", "36px");
});

// Read the file in and process/render it
function readFile(file, fileIndex) {
  // Using Blob URLs
  var blobURL = URL.createObjectURL(file);
  console.log('File '+fileIndex+' Blob URL: '+blobURL);
  loadPdf(blobURL, fileIndex);
  // --OR--
  // Generate a new FileReader object
  //var reader = new FileReader();
  // Process the PDF after reading it in (see call below function)
  //reader.onload = function(event) {
    //var pdf_url = event.target.result;
    //loadPdf(pdf_url);
  //}
  // Read the file in and trigger above onload event.
  //reader.readAsDataURL(file);
}

async function newFile() {
    pdfCount++;
    var now = new Date();
    var fileName = "New File " + now.toString().slice(0, 24);
    var newFile;

    // Create new PDF
    var newPDF = await PDFDocument.create();
    newPDF.addPage(PageSizes.Letter);
    var newPdfUri = await newPDF.saveAsBase64({ dataUri: true});
    // Create a file from the base64, save it to uploadedFiles[], and load it to create pdfjs and pdflib objects and display it
    var newPdfFile = await urltoFile(newPdfUri, fileName, 'application/pdf')
        .then(function(file){
            uploadedFiles[pdfCount] = file;
            loadPdf(URL.createObjectURL(file), pdfCount);
            console.log(file);
        });
}
function urltoFile(url, fileName, mimeType) {
    return (fetch(url)
        .then(function(res){return res.arrayBuffer();})
        .then(function(buf){return new File([buf], fileName, {type:mimeType});})
    );
}

export async function addScanPage(file, scanPage) {
    if (scanPage == 1) {
        // Create new scan document/file
        scanPageFiles = [];
        scanPagePdflibFiles = [];
        pdfCount++;
        currentScanFileIndex = pdfCount;
        var now = new Date();
        file.name = "Scan " + now.toString().slice(0, 24);
        uploadedFiles[pdfCount] = file;
        addFileMeta(pdfCount, file.name);
    }
    var blobURL = URL.createObjectURL(file);
    console.log('Temp Scan File '+scanPage+' Blob URL: '+blobURL);
    scanPageFiles[scanPage] = file;

    // Read in the data to create the pdflib and pdfjsLib objects
    const existingPdfBytes = await fetch(blobURL).then(res => res.arrayBuffer());
    // Create temporary pdf-lib object
    try {
        scanPagePdflibFiles[scanPage] = await PDFDocument.load(existingPdfBytes);
    }
    catch(error) {
        console.error(error);
        UIkit.notification({message: error, status: 'danger'});
        return;
    }

    // Scan is in progress, just add page thumbnail for now using pdfjs
    var loadingTask = pdfjsLib.getDocument({data: existingPdfBytes});
    loadingTask.promise.then(function(pdf) {
      console.log('Scan page number '+scanPage+' loaded');

      if (scanPage == 1) {
          // Add a canvas for the first page in file list
          var fileCanvas = document.createElement("canvas");
          var fileAnchor = document.createElement("a");
          $(fileAnchor).attr("href", '#file-'+currentScanFileIndex).append(fileCanvas);
          $('#pdf-'+currentScanFileIndex).prepend(fileAnchor);
      }

      // Create a canvas for the page in the workspace.
      var canvas = document.createElement("canvas");
      $(canvas).attr("data-file-number", currentScanFileIndex).attr("data-page-number", scanPage);
      var container = document.createElement("div");
      $(container).attr("class", "uk-inline uk-transition-toggle page-container uk-grid-margin");
      $(container).append(canvas);

      var pageButtonsHtml = '<div class="uk-transition-slide-right-small uk-position-right uk-overlay uk-overlay-default uk-background-primary uk-light">' +
        '<ul class="uk-iconnav uk-iconnav-vertical">' +
        '<li><a class="delete-page" uk-icon="icon: trash"></a></li>' +
        '<li><a class="copy-page" uk-icon="icon: copy"></a></li>' +
        '<li><a class="rotate-page-right" uk-icon="icon: forward"></a></li>' +
        '<li><a class="rotate-page-left" uk-icon="icon: reply"></a></li>' +
        '</ul></div>';
      $(container).append(pageButtonsHtml);

      $('#workspace-file-'+currentScanFileIndex).append(container);
      renderPage(pdf, 1, canvas);

      // For first page only, render to the file canvas
      if (scanPage == 1) renderPage(pdf, 1, fileCanvas);

    }, function (reason) {
      console.error(reason);
    });
}

export async function finishScan() {
    // Combine individual scanned PDFs into one to keep in memory
    var outputPDF = await PDFDocument.create();
    console.log('Finished scan, combining '+(scanPageFiles.length-1)+' scanned pages into single PDF');
    for(var i = 1; i < scanPageFiles.length; i++) {
        console.log('Adding page '+i);

        // each scanPagePdflib object is actually a single page PDF document, so take page 1 (0-indexed) from that document
        const [newPage] = await outputPDF.copyPages(scanPagePdflibFiles[i], [0]);
        outputPDF.addPage(newPage);
    }

    var outputPdfUri = await outputPDF.saveAsBase64({ dataUri: true});
    // We don't need to add to uploadedFiles[], because that already exists with the file name, and that's all we need it for.
    // Add to pdfjsFiles[], in case we need to re-render pages or show them full screen.
    const finishedPdfBytes = await fetch(outputPdfUri).then(res => res.arrayBuffer());
    var loadingTask = pdfjsLib.getDocument({data: finishedPdfBytes});
    loadingTask.promise.then(function(pdf) {
      pdfjsFiles[currentScanFileIndex] = pdf;
    });
    // We will need to add to pdflibFiles[], because it is used to save PDFs later.
    pdflibFiles[currentScanFileIndex] = outputPDF;

    console.log('Finished merging scanned pages');
    // Clear some memory
    scanPageFiles = [];
    scanPagePdflibFiles = [];
}

function addFileMeta(fileIndex, fileName, pageCount = null) {
    $('#files-header').parent().append('<li id="pdf-'+fileIndex+'" class="file-container uk-margin-bottom" data-file-number="'+fileIndex+'"><div id="caption-'+fileIndex+'" class="uk-thumbnail-caption"></div></li>');
    $('#workspace-container').append('<div id="file-'+fileIndex+'-container"><hr class="uk-divider uk-margin-top"><h2 id="file-'+fileIndex+'" class="uk-margin-top uk-margin-remove-bottom"><input type="text" class="uk-input uk-form-blank file-name-input" spellcheck="false" id="file-'+fileIndex+'-name" data-file-number="'+fileIndex+'" value="'+fileName+'"></input></h2><div id="workspace-file-'+fileIndex+'" class="workspace-file" uk-sortable="cls-placeholder: none; group: sortable-pages" uk-grid="margin: not-first-row"></div></div>');
    if (pageCount) {
        $('#caption-'+fileIndex).html('<ul><li>'+fileName+' ('+pageCount+' pages)</li></ul><ul class="uk-iconnav"><li><a class="uk-icon-link delete-file" uk-icon="trash"></a></li><li><a class="uk-icon-link download-file" uk-icon="file-pdf"></a></li><li><a class="uk-icon-link print-file" uk-icon="print"></a></li></ul>');
    } else {
        $('#caption-'+fileIndex).html('<ul><li>'+fileName+'</li></ul><ul class="uk-iconnav"><li><a class="uk-icon-link delete-file" uk-icon="trash"></a></li><li><a class="uk-icon-link download-file" uk-icon="file-pdf"></a></li><li><a class="uk-icon-link print-file" uk-icon="print"></a></li></ul>');
    }
}

// Process the PDF (split it and display it on webpage)
async function loadPdf(pdfUrl, fileIndex) {
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());

    // Create in-memory pdf-lib object
    try {
        pdflibFiles[fileIndex] = await PDFDocument.load(existingPdfBytes);
    }
    catch(error) {
        console.error(error);
        UIkit.notification({message: error, status: 'danger'});
        return;
    }

    // Use PDF.js to generate thumbnail images
    var loadingTask = pdfjsLib.getDocument({data: existingPdfBytes});
    loadingTask.promise.then(function(pdf) {
      addFileMeta(fileIndex, uploadedFiles[fileIndex].name, pdf.numPages);
      console.log('PDF number '+fileIndex+' loaded');
      pdfjsFiles[fileIndex] = pdf;

      // Add a canvas for the first page of the file
      var fileCanvas = document.createElement("canvas");
      var fileAnchor = document.createElement("a");
      $(fileAnchor).attr("href", '#file-'+fileIndex).append(fileCanvas);
      $('#pdf-'+fileIndex).prepend(fileAnchor);

      // Fetch each page
      for(var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          // Create a canvas for each page thumbnail.  Another approach is to render each canvas to an <img> element, with src=canvas.toDataURL()
          var canvas = document.createElement("canvas");
          $(canvas).attr("data-file-number", fileIndex).attr("data-page-number", pageNumber);
          var container = document.createElement("div");
          $(container).attr("class", "uk-inline uk-transition-toggle page-container uk-grid-margin");
          $(container).append(canvas);

          var pageButtonsHtml = '<div class="uk-transition-slide-right-small uk-position-right uk-overlay uk-overlay-default uk-background-primary uk-light">' +
            '<ul class="uk-iconnav uk-iconnav-vertical">' +
            '<li><a class="delete-page" uk-icon="icon: trash"></a></li>' +
            '<li><a class="copy-page" uk-icon="icon: copy"></a></li>' +
            '<li><a class="rotate-page-right" uk-icon="icon: forward"></a></li>' +
            '<li><a class="rotate-page-left" uk-icon="icon: reply"></a></li>' +
            '</ul></div>';
          $(container).append(pageButtonsHtml);

          $('#workspace-file-'+fileIndex).append(container);
          renderPage(pdf, pageNumber, canvas);

          // For first page only, render to the file canvas
          if (pageNumber == 1) renderPage(pdf, pageNumber, fileCanvas);
      }
    }, function (reason) {
      console.error(reason);
    });
}

// Render the pages to the canvas (or <img>) that are already in the DOM
function renderPage(pdfjsFile, pageNumber, canvas, rotation = null) {
    pdfjsFile.getPage(pageNumber).then(function(page) {
      var scale = 0.4;
      var viewport = page.getViewport({scale: scale});
      if (rotation == null) {
          // Use the rotation already set on the page
          rotation = viewport.rotation;
      } else {
          // Set the new rotation on the viewport
          viewport = page.getViewport({scale: scale, rotation: rotation});
      }

      var context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.dataset.rotate = rotation;

      // Render PDF page into canvas context
      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      var renderTask = page.render(renderContext);
      renderTask.promise.then(function () {
        console.log('Page '+pageNumber+' rendered');
      });
    });
}
