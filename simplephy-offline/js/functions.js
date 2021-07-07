
/**
 * Function to move the progress bar while loading a set of images.
 * @param {integer} loaded - The current iteration of the loading bar
 * @param {integer} max - The maximum iteration of the loading bar
 */
function moveLoadingBar(loaded, max) {
    loaded++;
    if (loaded == max) {
        $("#loading-bar").hide();
        $("#trial-container").css("display", "table");
        $("#loading-bar-progress").css("width", "0%");
        //console.log("move",loadingInfo);
        if (!loadingInfo)
            $("#stimulus-container").show();

        window.scrollTo(0, 0);
        getDisplayParameters();
        if ($("#stimulus-container").height() > screen.height) { //does not fit in the screen
            $(".stimulus-img").css("clear", "none"); // do not break lines for MAFC
        }
        stimulusOn = Date.now();
        if (arr.config.options.timeout[currentSlice] > 0 && loading && !("text" in stimuli.info)) {
            timeout = setTimeout(
                showResponse,
                arr.config.options.timeout[currentSlice],
                arr.config.options.ratings,
                arr.continueFrom + 1
            );
        }
        running = true; loading = false;
    }
    else
        $("#loading-bar-progress").css("width", (100 * (loaded + 1) / max) + "%");
}
function load_stimuli_drive(list, info, feedback) {
    return new Promise((resolve, reject) => {
        //list.push(...list);

        MAFC = false;
        if (arr.config.options.multiple.localeCompare("first") == 0) {
            //list=[list[0]];
        } else if (arr.config.options.multiple.startsWith("MAFC")) {
            $("#stimulus").html("");
            if (arr.config.options.multiple == "MAFCcircle") {
                angle = 360 / list.length;
                MAFCdistance = 20;
                $("#stimulus").addClass("circle");
                $("#stimulus-container").css("width", "100%");
                $("#stimulus-container").css("height", "100%");
            } else {
                $("#stimulus").addClass("mafc" + list.length);
            }
            MAFC = true;
        }


        $("#loading-bar").show();
        $("#trial-container").hide();
        loaded = 0;
        loading = true;
        running = false;
        var stimuli = { img: [], info: null };

        stimuli.info = {};
        if ("local" in arr.config.options && arr.config.options.local) {
            stimuli.info = info;
            loadTrialLocal(stimuli, list, feedback, MAFC);
            //console.log(stimuli);
            resolve(stimuli);
        } else if (info) {
            loadingInfo = true;
            $("#stimulus-container").hide();
            $.getJSON(directoryPath + "php/getJson.php?id=" + info.id, function (data) {
                stimuli.info = data;
                if (!calibrated && !("text" in stimuli.info))
                    stimuli.info.text = "Recalibration finished. Press SPACEBAR to continue";
                if (stimuli.info.text && stimuli.info.text != "" && preparation == false) {
                    $("#trial-container .text").css("display", "table");
                    $("#trial-container .text div").html(stimuli.info.text);
                    preparation = true;
                } else {
                    $("#stimulus-container").show();
                }
                loadingInfo = false;
            }).fail(function (data) {
                loadingInfo = false;
                $("#stimulus-container").show();
                //reject(stimuli);
            }).always(function (data) {
                loadTrialGoogleDrive(stimuli, list, feedback, MAFC);
                resolve(stimuli);
            });
        } else {
            loadTrialGoogleDrive(stimuli, list, feedback, MAFC);
            //console.log(stimuli);
            resolve(stimuli);
        }
    })
    //return stimuli;
}

function load_stimuli(name) {
    var stimuli = { img: [], info: null };
    running = false; loading = true;
    loaded = 0;
    var exists = true;
    var i = 0;
    while (exists) {
        if (imageExists(name + "/noise_" + (i + 1) + ".jpg")) {
            stimuli.img[i] = new Image();
            stimuli.img[i].onload = function () {
                loaded++;
                if (loaded == 50) {
                    $("#loading-bar").hide();
                    $("#trial-container").css("display", "table");
                    $("#loading-bar-progress").css("width", "0%");
                    $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / loaded + "%");
                    $("#trial-container .text").css("display", "table");
                    $("#trial-container .text div").html(stimuli.info.text);
                    preparation = true;
                    window.scrollTo(0, 0);
                    getDisplayParameters();
                    stimulusOn = Date.now();
                }
                else
                    $("#loading-bar-progress").css("width", (100 * (loaded + 1) / 50) + "%")
            }

            stimuli.img[i].onerror = function () {
                //alert("Error loading stimuli, please reload the page");
                resetExperiment(1, calibrating, animCalibration, "There was an error loading the trial, please try again");
            }
            stimuli.img[i].src = name + "/noise_" + (i + 1) + ".jpg";
            stimuli.img[i].setAttribute("class", "stimulus-img");
            stimuli.img[i].setAttribute("numImg", i + 1);
            i += 1;
        } else {
            exists = false;
        }
        if (i == 100) {
            exists = false;
        }
    }

    stimuli.slices = stimuli.img.length;
    stimuli.info = {
        signalSize: 0,
        locations: [-1, -1, -1],
        contrast: 0,
    };
    $.getJSON(name + "/locations.json", function (data) {
        stimuli.info = data;
    }).fail(function () {

    });
    running = true; loading = false;

    return stimuli;
}

function load_stimuli2(name) {
    var stimuli = { img: [], info: null };
    var canvas = { img: [], info: null };

    listImages = [];
    ctx = [];

    var exists = true;
    var i = 1;
    while (exists) {
        if (imageExists("stimuli/" + name + "/noise_" + i + ".jpg")) {
            listImages.push("stimuli/" + name + "/noise_" + i + ".jpg");
        } else {
            exists = false;
        }
        if (i == 100) {
            exists = false;
        }
        i += 1;
    }

    //console.log(canvas.img[1]);

    listImages = listImages.map(function (i) {
        var img = document.createElement("img");
        img.src = i;
        return img;
    });

    Promise.all(listImages.map(function (image) {
        return new Promise(function (resolve, reject) {
            image.onload = resolve;
        });
    })).then(function () {
        var canvas_img = [];
        for (var i = 0; i < listImages.length; i++) {
            var img = listImages[i];

            canvas_img[i] = document.createElement("canvas");
            canvas_img[i].id = "stimuli" + i;
            canvas_img[i].width = 1024;
            canvas_img[i].height = 820;

            canvas_img[i].getContext("2d").drawImage(img, 0, 0);
            canvas_img[i] = canvas_img[i].toDataURL();
        }
        //console.log(canvas_img);
        canvas.img = canvas_img;
    });

    canvas.slices = i - 1;
    canvas.info = {
        signalSize: 0,
        locations: [-1, -1, -1],
        contrast: 0,
    };
    $.getJSON("stimuli/" + name + "/locations.json", function (data) {
        canvas.info = data;
    }).fail(function () {

    });

    return canvas;

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function imageExists(image_url) {

    var http = new XMLHttpRequest();

    http.open('HEAD', image_url, false);
    http.send();

    return http.status != 404;

}

function showResponse(ratings, trialNumber, afterFixation = false) {
    if (preparation) return;

    if (arr.config.options.multiple == "first" && numSlices - 1 > currentSlice && stimulusOn != -1) {
        //show the next image (if any)
        if (stimulusOn != -1) {
            currentSlice = Math.max(0, Math.min(numSlices - 1, currentSlice + 1));
            scrolling.push(Array(1, Date.now()));
        }
        //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
        $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);
        if (arr.config.options.timeout[currentSlice] > 0) {
            $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);
            timeout = setTimeout(
                showResponse,
                arr.config.options.timeout[currentSlice],
                arr.config.options.ratings,
                arr.continueFrom + 1
            );
        }
        return;
    }

    if ("fixationGrid" in arr.config.options && arr.config.options.fixationGrid == "true" && !afterFixation) {
        $("#stimulus").hide();
        $("#fixation-grid").empty();
        $("#fixation-grid").css("width", arr.config.display.stimulusWidth + "px");
        $("#fixation-grid").css("height", arr.config.display.stimulusHeight + "px");

        let minSize = 100;
        rows = arr.config.display.stimulusHeight / minSize;
        cols = arr.config.display.stimulusWidth / minSize;

        fixationGridBase.sort(() => Math.random() - 0.5);
        fixationGrid = [];
        count = 0;
        for (i = 0; i < parseInt(rows); i++) {
            gridRow = [];
            for (j = 0; j < parseInt(cols); j++) {
                clearClass = "";
                if (j == 0)
                    clearClass = "clear";
                $("#fixation-grid").append("<div class='fixation-cell " + clearClass + "' style='width:" + (minSize + minSize * (cols % 1) / 10) + "px;height:" + (minSize + minSize * (rows % 1) / 10) + "px;line-height: " + (minSize + minSize * (rows % 1) / 10) + "px;'>" +
                    fixationGridBase[count] + "</div>");
                gridRow.push(fixationGridBase[count]);
                count++;
            }
            fixationGrid.push(gridRow);
        }

        $("#fixation-grid").show();

        timeout = setTimeout(
            showResponse,
            300,
            arr.config.options.ratings,
            arr.continueFrom + 1,
            true
        );
        return;
    }

    $("#stimulus").show();
    $("#fixation-grid").hide();

    stimulusOff = Date.now();
    if (!running) return;

    responding = true; running = false;
    $("#trial-container").hide();
    $("#confidence-scale").text("");
    if (!stimuli.info.customResponse && arr.config.options.ratings > 1) {
        stimuli.info.customResponse = [{ "question": "", "type": "rating", "max": arr.config.options.ratings }];
    }
    if (afterFixation) {
        stimuli.info.customResponse.unshift({ "question": "What code did you see at the end?", "type": "code" });
    }
    if (stimuli.info.customResponse) {
        if (!Array.isArray(stimuli.info.customResponse))
            stimuli.info.customResponse = Array(stimuli.info.customResponse);
        for (r = 0; r < stimuli.info.customResponse.length; r++) {
            if (stimuli.info.customResponse[r].type == "rating") {
                q = jQuery('<div/>', {
                    "class": 'question',
                    "num": r + 1,
                    "value": -1,
                }).appendTo('#confidence-scale');
                q.append("<div>" + stimuli.info.customResponse[r].question + "</div><div class='options'></div>");
                if (stimuli.info.customResponse[r].max == undefined) stimuli.info.customResponse[r].max = 8;
                if (stimuli.info.customResponse[r].max <= 10) {
                    for (i = 0; i < stimuli.info.customResponse[r].max; i++) {
                        if (i < stimuli.info.customResponse[r].max / 2) divclass = "absent";
                        else divclass = "present";
                        //console.log('rating '+divclass);
                        jQuery('<div/>', {
                            "class": 'rating ' + divclass,
                            "num": i + 1,
                            title: i + 1,
                            text: i + 1
                        }).appendTo(q.find(".options"));
                    }
                } else {
                    q.find(".options").append('<div class="slidecontainer"> \
                        <div class="slider-value response" value='+ Math.floor(stimuli.info.customResponse[r].max / 2) + '>' + Math.floor(stimuli.info.customResponse[r].max / 2) + '</div> \
                        <input type="range" min="1" max="'+ stimuli.info.customResponse[r].max + '" value="' + Math.floor(stimuli.info.customResponse[r].max / 2) + '" class="slider"> \
                    </div>');
                }
            } else if (stimuli.info.customResponse[r].type == "code") {
                q = jQuery('<div/>', {
                    "class": 'question',
                    "num": r + 1,
                }).appendTo('#confidence-scale');
                q.append("<div>" + stimuli.info.customResponse[r].question + "</div>");
                q.append('<input type="text" class="textresponse" maxlength="100">');
            } else if (stimuli.info.customResponse[r].type == "text") {
                q = jQuery('<div/>', {
                    "class": 'question',
                    "num": r + 1,
                    "value": -1,
                }).appendTo('#confidence-scale');
                q.append("<div>" + stimuli.info.customResponse[r].question + "</div>");
                q.append('<textarea class="textresponse" placeholder="Introduce your response" rows="4" cols="100" title="Introduce your response"></textarea>');
            } else if (stimuli.info.customResponse[r].type == "select") {
                q = jQuery('<div/>', {
                    "class": 'question',
                    "num": r + 1,
                    "value": -1,
                }).appendTo('#confidence-scale');
                q.append("<div>" + stimuli.info.customResponse[r].question + "</div><div class='options'></div>");
                for (i = 0; i < stimuli.info.customResponse[r].options.length; i++) {
                    //console.log('rating '+divclass);
                    jQuery('<div/>', {
                        "class": 'rating option',
                        "num": stimuli.info.customResponse[r].options[i],
                        title: stimuli.info.customResponse[r].options[i],
                        text: stimuli.info.customResponse[r].options[i]
                    }).appendTo(q.find(".options"));
                }
            }
        }
    } else {
        if (arr.config.options.ratings == 1) {
            //calibrated=false;
            responding = false;
            //if(arr.data.length>0)
            saveTrial(-1);
            /*else
                nextTrial(currentSlice,numSlices);*/
            return;
        }
        /*
                q=jQuery('<div/>', {
                    "class": 'question',
                    "num": 1,
                    "value": -1,
                }).appendTo('#confidence-scale');
                
                for(i=0;i<ratings;i++){
                    if(i<ratings/2) divclass="absent";
                    else divclass="present";
                    //console.log('rating '+divclass);
                    jQuery('<div/>', {
                        "class": 'rating '+divclass,
                        "num": i+1,
                        title: i+1,
                        text: i+1
                    }).appendTo(q);
                }*/
    }
    $("#response-container").css("display", "table");
    $("#response-text").text("Trial: " + (trialNumber));
    $('#confidence-scale').append("<br><br>Press SPACEBAR to continue");
    $("#help").hide();
}

function finishExperiment(arr) {
    results = { results: JSON.stringify(arr) };
    Cookies.remove('simplephy', { path: window.location.pathname });

    $.ajax({
        type: "POST",
        url: directoryPath + "php/upload.php",
        data: results,
        success: function (data) {
            //console.log("SUCCESS");
            //console.log(data["responseText"]);
        },
        error: function (data) {
            //console.log("ERROR");
            //console.log(data["responseText"]);
            //console.log(data);
            resetExperiment(1, calibrating, animCalibration, "There was an error uploading your data, please try again (F)");
        }
    });

    /*var hiddenElement = document.createElement('a');

    hiddenElement.href = 'data:attachment/text,' + JSON.stringify(arr);
    hiddenElement.target = '_blank';
    hiddenElement.id= 'download';
    
    hiddenElement.download = arr.name+'.pso';

    hiddenElement.text='You can also download your data here';

    $("#download-data").html(hiddenElement);*/
}

function getDisplayParameters() {
    if (running || loading || responding) {
        var img = document.querySelector(".stimulus-img");

        //$('#help #monitor-size').html("Monitor: "+parseInt(display.monitorWidth)+" by "+parseInt(display.monitorHeight) +" cm");
        $('#help #resolution').html("Resolution: " + screen.width + " by " + screen.height);
        $('#help #image-size').html("Stimulus: " + img.width + " by " + img.height);
        $('#help #image-real-size').html("Stimulus original: " + img.naturalWidth + " by " + img.naturalHeight);
        arr.config.display.stimulusWidth = img.width;
        arr.config.display.stimulusHeight = img.height;


        /*
        ratio=img.naturalWidth/img.width;
        //console.log(ratio);
        pixelsPerCM=screen.width/display.monitorWidth;
        distance=(1/display.degreesPerPixel)/Math.tan(1 * Math.PI/180)/pixelsPerCM/ratio;

        $('#help #distance-required').html("Distance required: "+parseInt(distance)+" cm");
        */

        if (arr.config.options.calibration > 0) {
            arr.config.display.blindSpotDistance = blindSpotDistance;
            arr.config.display.pixelsPerDegree.push([(mean(arr.config.display.blindSpotDistance) / blindSpotDegrees), Date.now()]);
            distance = (arr.config.display.pixelsPerDegree.slice(-1)[0][0] * (1 / arr.config.display.pixelsPerCM) / Math.tan(1 * Math.PI / 180));
            arr.config.display.distance.push([distance, Date.now()]);
        } else {
            distance = "not measured";
        }

        $('#help #distance-required').html("Distance: " + parseInt(distance) + " cm (" + parseInt(distance / 2.54) + " in)");
    }
}

function calibrationMove(elem) {
    var pos = 100;
    var direction = 20;
    var id = setInterval(frame, 200, elem);

    function frame(elem) {
        var maxDisplacement = $(elem).parent().width() - 20;
        if (pos >= maxDisplacement) {
            //direction*=-1;
            pos = 100;
        }
        pos += direction;
        //console.log(pos);
        $(elem).css("right", pos + "px");
    }

    return id;
}

function mean(numbers) {
    var total = 0, i;
    for (i = 0; i < numbers.length; i += 1) {
        total += numbers[i];
    }
    return total / numbers.length;
}

function cancelPopup(animCalibration) {
    $(".popup").hide();
    $(".background").css("filter", "none");
    $("body").css({ overflow: 'auto' });
    $(".background").css("opacity", "1");
    $("#calibration-step1").show();
    $("#calibration-step2").hide();
    $("#calibration-step3").hide();
    clearInterval(animCalibration);
}

function uploadTrial() {
    results = { results: JSON.stringify(arr) };
    //delete results.results.config;
    //console.log(arr);
    $.ajax({
        type: "POST",
        url: directoryPath + "php/upload.php",
        data: results,
        success: function (data) {
            //console.log("SUCCESS");
            //console.log(data);
        },
        error: function (data) {
            //console.log("ERROR");
            //console.log(data);
            resetExperiment(1, calibrating, animCalibration, "There was an error uploading your data, please try again (T)");
        }
    });
    arr.data = [];
}

function uploadParticipant() {
    participant = { participant: JSON.stringify(arr) };
    //delete participant.participant.data;
    $.ajax({
        type: "POST",
        url: directoryPath + "php/upload.php",
        data: participant,
        success: function (data) {
            //console.log("SUCCESSP");
            //console.log(data);
        },
        error: function (data) {
            //console.log("ERRORP");
            //console.log(data);
            resetExperiment(1, calibrating, animCalibration, "There was an error uploading your data, please try again (P)");
        }
    });
}

function resetExperiment(running, calibrating, animCalibration, text = "") {
    if (running || loading) {
        if (timeout != false)
            clearTimeout(timeout);
        $("#loading-bar").hide();
        $("#response-container").hide();
        $("#trial-container").hide();
        $("#help").hide();
        $("#name").hide();
        $("#form-container").show();
        //$("#name").val("");
        $("body").css("background-color", "#39302a");
        if (text == "")
            text = "Please keep fullscreen mode and do not leave the browser, experiment has been reset!";
        $(".error").html("<i class='fas fa-exclamation-circle'></i> " + text);
        $(".error").show();

        var noofTimeOuts = setTimeout('');
        for (var i = 0; i < noofTimeOuts; i++) clearTimeout(i);

        //uploadTrial();        
    }
    if (calibrating) {
        cancelPopup(animCalibration);
    }
    calibrated = running = loading = false;
}


function selectStimuli(files) {
    var files = evt.target.files; // FileList object

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

        // Only process image files.
        if (!f.type.match('image.*')) {
            continue;
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                // Render thumbnail.
                var span = document.createElement('span');
                span.innerHTML = ['<img class="thumb" src="', e.target.result,
                    '" title="', escape(theFile.name), '"/>'].join('');
                document.getElementById('list').insertBefore(span, null);
            };
        })(f);

        // Read in the image file as a data URL.
        reader.readAsDataURL(f);
    }
}

Math.getDistance = function (x1, y1, x2, y2) {

    var xs = x2 - x1,
        ys = y2 - y1;

    xs *= xs;
    ys *= ys;

    return Math.sqrt(xs + ys);
};
var savedResponses = -1;
var correctResponse = -1;
function saveTrial(responses) {
    $("#response-container").hide();

    if (!showingFeedback && stimuli.feedback) {
        $("#feedback-container .cell .stimulus-img").replaceWith(stimuli.feedback);
        $("#feedback-container").css("display", "table");
        showingFeedback = true;
        savedResponses = responses;
        return false;
    } else if (!showingFeedback && (stimuli.info.correctKey || stimuli.info.correctResponse)) {
        correctResponse = true;
        if (stimuli.info.correctKey && stimuli.info.correctkey != "" && pressedKey[0][0] != stimuli.info.correctKey) {
            correctResponse = false;
        }
        if (correctResponse && stimuli.info.correctResponse) {
            for (i = 0; i < stimuli.info.correctResponse.length; i++) {
                if (!isNaN(parseFloat(stimuli.info.correctResponse[i]))) //if number, add ==
                    stimuli.info.correctResponse[i] = "==" + stimuli.info.correctResponse[i];
                if (stimuli.info.correctResponse[i] != "" &&
                    ((!isNaN(parseFloat(responses[i])) && !eval(responses[i] + stimuli.info.correctResponse[i])) ||
                        isNaN(parseFloat(responses[i])) && responses[i] != stimuli.info.correctResponse[i])) {
                    correctResponse = false;
                    break;
                }
            }
        }
        if (correctResponse) {
            $("#feedback-container .cell .stimulus-img").replaceWith("<div class='stimulus-img correct'>CORRECT</div>");
        } else {
            $("#feedback-container .cell .stimulus-img").replaceWith("<div class='stimulus-img incorrect'>INCORRECT</div>");
        }
        $("#feedback-container").css("display", "table");
        showingFeedback = true;

        return false;
    }

    showingFeedback = false;
    if (!calibrated && !cheatCode) {
        calibrating = true;
        document.documentElement.requestFullscreen();
        blindSpotDistance = [];
        $("#calibration-dialog").show();
        $(".background").css("filter", "blur(4px)");
        $(".background").css("opacity", ".4");
        savedResponses = rating;
    } else {
        if (savedResponses != -1) {
            responses = savedResponses;
            savedResponses = -1;
        }

        arr.data.push({
            trialID: arr.trialSequence[arr.sortIndexes[arr.continueFrom]],
            responses: responses,
            info: stimuli.info,
            stimulusOn: stimulusOn,
            stimulusOff: stimulusOff,
            condition: arr.conditionSequence[arr.sortIndexes[arr.continueFrom]],
            marks: marks,
            playPause: playPause,
            pressedKey: pressedKey,
            scrolling: scrolling,
            correctResponse: correctResponse,
            fixationGrid: fixationGrid
        });
        arr.continueFrom = arr.continueFrom + 1;
        //console.log(arr);
        currentSlice = 0;
        if (arr.continueFrom == arr.config.maxTrials) {
            //finish
            arr.stopTime = Date.now();
            running = false;
            $("#trial-container").hide();
            $("#finished-container").show();
            finishExperiment(arr);
        } else {
            trialID = arr.trialSequence[arr.sortIndexes[arr.continueFrom]];
            marks = [];
            pressedKey = [];
            scrolling = [];
            stimulusOn = -1;
            $(".mark").remove();
            //console.log(trialSequence);
            //$("#trial-container").show();
            //stimuli=load_stimuli(stimuli_name);

            if (!arr.config.conditions) {
                stimuli_name = "stimuli/" + (presenceSequence[trialID] ? "present" : "absent") + "/noise" + (trialID + 1);
                stimuli = load_stimuli(stimuli_name);
            } else {
                /*if(gapi.client.getToken()!=null){
                    if(arr.trialSequence[arr.sortIndexes[arr.continueFrom]] in arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles){
                        stimuli=load_stimuli_drive_js(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                            arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                            arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]]);
                    }else{
                        stimuli=load_stimuli_drive_js(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                            arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                            null);
                    }
                }else{*/
                while (arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]] == null) {
                    arr.continueFrom++;
                }
                if (arr.trialSequence[arr.sortIndexes[arr.continueFrom]] in arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles) {
                    load_stimuli_drive(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                        arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                        arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]]).then(data => {
                            stimuli = data;
                            if (arr.config.options.calibration > 0 && (Date.now() - arr.config.display.pixelsPerDegree.slice(-1)[0][1]) > arr.config.options.calibration * 1000 * 60) { // recalibrate every 10 minutes
                                calibrated = false;
                            }
                            nextTrial(currentSlice, numSlices);
                        });
                } else {
                    load_stimuli_drive(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                        arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                        null).then(data => {
                            stimuli = data;
                            if (arr.config.options.calibration > 0 && (Date.now() - arr.config.display.pixelsPerDegree.slice(-1)[0][1]) > arr.config.options.calibration * 1000 * 60) { // recalibrate every 10 minutes
                                calibrated = false;
                            }
                            nextTrial(currentSlice, numSlices);
                        });
                }
                //}
            }



        }
    }
}

function nextTrial(currentSlice, numSlices) {
    if (arr.data.length > 0)
        uploadTrial();
    if (!calibrated && !cheatCode) {
        calibrating = true;
        document.documentElement.requestFullscreen();
        blindSpotDistance = [];
        $("#calibration-dialog").show();
        $(".background").css("filter", "blur(4px)");
        $(".background").css("opacity", ".4");
        $("#calibration-dialog .close").hide();
        $("#calibration-step1").hide();
        $("#calibration-step2").show();
        $("#calibration-step3").hide();
        clearInterval(animCalibration);
        animCalibration = calibrationMove($("#calibration-step2 .blind-spot-dot"));
    }
    $("#stimulus-slice").text("Slice: " + (currentSlice + 1));
    $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / numSlices + "%");
    $("#trial-number").text("Trial: " + (arr.continueFrom + 1));
}

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

function popupWindow(url, title, win, w, h) {
    const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2);
    const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2);
    return win.open(url, title, `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);
}

function createUUID() {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

$.fn.randomize = function (selector) {
    (selector ? this.find(selector) : this).parent().each(function () {
        $(this).children(selector).sort(function () {
            return Math.random() - 0.5;
        }).detach().appendTo(this);
    });

    return this;
};

function loadExperimentData(data) {
    $("#load-experiment-label").hide();
    $(".home-instructions").hide();
    if (!Cookies.get('simplephy'))
        $('<p class="home-instructions">Enter your name and click on Start. Calibration will start first.</p>').insertAfter($(".home-instructions")[1]);

    arr.config.options = {};
    for (key in data.options) {
        //console.log(key,data.options[key]);
        arr.config.options[key] = data.options[key];
    }
    arr.config.options.timeout = arr.config.options.timeout.split(",").map(Number);
    instructions = "";
    if (validURL(arr.config.options.instructions)) {
        instructions = "<h2><a href='" + arr.config.options.instructions + "' target='popup' onclick=\"popupWindow('" + arr.config.options.instructions + "', 'popup', window, 800, 800);\">Read instructions for this experiment</a></h2>"
    }

    $("#form-box").html("<h3>Experiment <strong>" + data["options"]["title"] + "</strong> loaded!</h3>" + instructions + "<p><a href='" + directoryPath + "'>Reset</a></p>");
    document.title = data["options"]["title"] + ' - SimplePhy';

    //arr.config.ratings=data["ratings"];
    //arr.config.name=data["title"];
    arr.config.conditions = data["conditions"];
    //console.log(data);
    if (arr.config.options.calibration == undefined)
        arr.config.options.calibration = 10;
    else if (arr.config.options.calibration == "")
        arr.config.options.calibration = 0;
    else
        arr.config.options.calibration = parseFloat(arr.config.options.calibration);

    if (arr.config.options.keys != undefined)
        allowedKeys = arr.config.options.keys.split(',');
    else
        allowedKeys = ["Space"];

}

function beginExperiment(resuming) {
    if (!resuming) {
        conditionSequence = [];
        trialSequence = [];
        numConditions = arr.config.conditions.length;

        if (arr.config.options.randomize != undefined) {
            if (arr.config.options.randomize.localeCompare("randomrandom") == 0) {
                conditionOrder = Array.from({ length: numConditions }, (v, k) => k);
                conditionOrder.sort(function (a, b) { return 0.5 - Math.random() });
                //console.log(conditionOrder);
                for (i = 0; i < numConditions; i++) {
                    newT = Array.from({ length: arr.config.conditions[conditionOrder[i]].stimuli.stimulusFiles.length }, (v, k) => k);
                    trialSequence = trialSequence.concat(newT.sort(function (a, b) { return 0.5 - Math.random() }));
                    conditionSequence = conditionSequence.concat(Array.from({ length: arr.config.conditions[conditionOrder[i]].stimuli.stimulusFiles.length }, (v, k) => conditionOrder[i]));
                }
                sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
            } else if (arr.config.options.randomize.localeCompare("consecutiverandom") == 0) {
                conditionOrder = Array.from({ length: numConditions }, (v, k) => k);
                //conditionOrder.sort(function(a, b) {return 0.5 - Math.random()});
                //console.log(conditionOrder);
                trialConditions = Array(numConditions);
                for (i = 0; i < numConditions; i++) {
                    trialConditions[i] = Array.from({ length: arr.config.conditions[conditionOrder[i]].stimuli.stimulusFiles.length }, (v, k) => k);
                    trialConditions[i] = trialConditions[i].sort(function (a, b) { return 0.5 - Math.random() });
                }
                for (i = 0; i < arr.config.conditions[conditionOrder[0]].stimuli.stimulusFiles.length; i++) {
                    for (c = 0; c < numConditions; c++) {
                        trialSequence = trialSequence.concat(trialConditions[c][i]);
                        conditionSequence = conditionSequence.concat(conditionOrder[c]);
                    }
                }
                sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
            } else if (arr.config.options.randomize.localeCompare("randomkeep") == 0) {
                conditionOrder = Array.from({ length: numConditions }, (v, k) => k);
                conditionOrder.sort(function (a, b) { return 0.5 - Math.random() });
                for (i = 0; i < numConditions; i++) {
                    trialSequence = trialSequence.concat(Array.from({ length: arr.config.conditions[conditionOrder[i]].stimuli.stimulusFiles.length }, (v, k) => k));
                    conditionSequence = conditionSequence.concat(Array.from({ length: arr.config.conditions[conditionOrder[i]].stimuli.stimulusFiles.length }, (v, k) => conditionOrder[i]));
                }
                sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
            } else if (arr.config.options.randomize.localeCompare("keeprandom") == 0) {
                for (i = 0; i < numConditions; i++) {
                    newT = Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => k);
                    trialSequence = trialSequence.concat(newT.sort(function (a, b) { return 0.5 - Math.random() }));
                    conditionSequence = conditionSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => i));
                }
                sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
            } else if (arr.config.options.randomize.localeCompare("keepkeep") == 0) {
                for (i = 0; i < numConditions; i++) {
                    trialSequence = trialSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => k));
                    conditionSequence = conditionSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => i));
                }
                sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
            } else {
                for (i = 0; i < numConditions; i++) {
                    trialSequence = trialSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => k));
                    conditionSequence = conditionSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => i));
                }
                sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
                if (arr.config.options.randomize == undefined || arr.config.options.randomize.localeCompare("true")) {
                    sortIndexes.sort(function (a, b) { return 0.5 - Math.random() });
                }
            }
        } else {
            for (i = 0; i < numConditions; i++) {
                trialSequence = trialSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => k));
                conditionSequence = conditionSequence.concat(Array.from({ length: arr.config.conditions[i].stimuli.stimulusFiles.length }, (v, k) => i));
            }
            sortIndexes = Array.from({ length: conditionSequence.length }, (v, k) => k);
            if (arr.config.options.randomize == undefined || arr.config.options.randomize.localeCompare("true")) {
                sortIndexes.sort(function (a, b) { return 0.5 - Math.random() });
            }
        }
        arr.name = name;
        arr.sortIndexes = sortIndexes;
        arr.trialSequence = trialSequence;
        arr.conditionSequence = conditionSequence;
        arr.config.maxTrials = sortIndexes.length;
        uploadParticipant();
    }

    trialID = arr.trialSequence[arr.sortIndexes[arr.continueFrom]];

    while (arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]] == null) {
        arr.continueFrom++;
    }

    if (!arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles) {
        arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles = [];
    }

    /*if(gapi.client.getToken()!=null){
        if(arr.trialSequence[arr.sortIndexes[arr.continueFrom]] in arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles){
            stimuli=load_stimuli_drive_js(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]]);
        }else{
            stimuli=load_stimuli_drive_js(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
                null);
        }
    }else{*/
    $("body").css("background-color", "rgb(128,128,128)");

    if (arr.trialSequence[arr.sortIndexes[arr.continueFrom]] in arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles) {
        load_stimuli_drive(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
            arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
            arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.feedbackFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]])
            .then(data => {
                stimuli = data;
                Cookies.set('simplephy', [arr.config.options.id, name], { expires: 10, sameSite: 'strict', path: window.location.pathname })

                //console.log(stimuli);
                //document.body.appendChild(stimuli.img[1]);
                numSlices = stimuli.slices;
                if (arr.config.options.multiple.localeCompare("MAFC") == 0) {
                    $("#trial-container .instructions").text("Double click on the signal-present stimulus");
                } else {
                    $("#trial-container .instructions").text("Press SPACEBAR to continue");
                }
                getDisplayParameters();
                nextTrial(currentSlice, numSlices);
            });
    } else {
        load_stimuli_drive(arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.stimulusFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
            arr.config.conditions[arr.conditionSequence[arr.sortIndexes[arr.continueFrom]]].stimuli.infoFiles[arr.trialSequence[arr.sortIndexes[arr.continueFrom]]],
            null)
            .then(data => {
                stimuli = data;
                Cookies.set('simplephy', [arr.config.options.id, name], { expires: 10, sameSite: 'strict', path: window.location.pathname })

                //console.log(stimuli);
                //document.body.appendChild(stimuli.img[1]);
                numSlices = stimuli.slices;
                if (arr.config.options.multiple.localeCompare("MAFC") == 0) {
                    $("#trial-container .instructions").text("Double click on the signal-present stimulus");
                } else {
                    $("#trial-container .instructions").text("Press SPACEBAR to continue");
                }
                getDisplayParameters();
                nextTrial(currentSlice, numSlices);
            });
    }
    //}


}

function activateCheatCode() {
    $("#cheatcode").toggleClass("hidden");
    $(".dev").toggleClass("hidden");
}

function fetchHeader(url, wch) {
    try {
        var req = new XMLHttpRequest();
        req.open("HEAD", url, false);
        req.send(null);
        if (req.status == 200) {
            //console.log(url, req.getResponseHeader(wch));
            return new Date(req.getResponseHeader(wch));
        }
        else return false;
    } catch (er) {
        return er.message;
    }
}

function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}